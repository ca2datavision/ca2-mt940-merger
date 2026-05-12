#!/usr/bin/env npx tsx
/**
 * MT940 Merge Verification Tool
 *
 * Verifies that an MT940 file is the correct merge of source files.
 *
 * Usage:
 *   npx tsx tools/verify-merge.ts --zip sources.zip --merged output.mt940
 *   npx tsx tools/verify-merge.ts --zip sources.zip --merged output.mt940 --output report.json
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import * as mt940 from 'mt940-js';
import JSZip from 'jszip';

interface VerificationIssue {
  category: 'completeness' | 'syntax' | 'logic' | 'fidelity';
  severity: 'error' | 'warning';
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

interface VerificationReport {
  valid: boolean;
  sourceFiles: number;
  sourceTransactions: number;
  mergedTransactions: number;
  issues: VerificationIssue[];
  timestamp: string;
}

interface ParsedStatement {
  referenceNumber: string;
  accountId: string;
  number: string;
  openingBalance: { isCredit: boolean; date: string; currency: string; value: number };
  closingBalance: { isCredit: boolean; date: string; currency: string; value: number };
  transactions: Array<{
    isCredit: boolean;
    amount: number;
    valueDate: string;
    entryDate: string;
    description: string;
    customerReference: string;
  }>;
}

function parseArgs(): { zip: string; merged: string; output?: string } {
  const args = process.argv.slice(2);
  let zip = '';
  let merged = '';
  let output: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--zip' && args[i + 1]) {
      zip = args[++i];
    } else if (args[i] === '--merged' && args[i + 1]) {
      merged = args[++i];
    } else if (args[i] === '--output' && args[i + 1]) {
      output = args[++i];
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
MT940 Merge Verification Tool

Usage:
  npx tsx tools/verify-merge.ts --zip <sources.zip> --merged <output.mt940> [--output report.json]

Options:
  --zip <path>      ZIP archive containing source MT940 files
  --merged <path>   MT940 file to verify (alleged merge result)
  --output <path>   Optional: write JSON report to file
  --help, -h        Show this help message

Exit codes:
  0 = valid merge
  1 = validation errors found
`);
      process.exit(0);
    }
  }

  if (!zip || !merged) {
    console.error('Error: --zip and --merged arguments are required');
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  return { zip, merged, output };
}

async function extractMT940FromZip(zipPath: string): Promise<Map<string, string>> {
  const zipData = readFileSync(resolve(zipPath));
  const zip = await JSZip.loadAsync(zipData);
  const files = new Map<string, string>();

  for (const [name, file] of Object.entries(zip.files)) {
    if (file.dir) continue;
    const ext = name.toLowerCase();
    if (ext.endsWith('.mt940') || ext.endsWith('.sta') || ext.endsWith('.mt') || ext.endsWith('.txt')) {
      const content = await file.async('string');
      if (content.includes(':20:') && content.includes(':60')) {
        files.set(name, content);
      }
    }
  }

  return files;
}

async function parseMT940(content: string): Promise<ParsedStatement[]> {
  const buffer = new TextEncoder().encode(content);
  const result = await mt940.read(buffer.buffer);
  return result as ParsedStatement[];
}

function verifyCompleteness(
  sourceStatements: ParsedStatement[],
  mergedStatements: ParsedStatement[],
  issues: VerificationIssue[]
): void {
  const sourceTxCount = sourceStatements.reduce((sum, s) => sum + s.transactions.length, 0);
  const mergedTxCount = mergedStatements.reduce((sum, s) => sum + s.transactions.length, 0);

  if (sourceTxCount !== mergedTxCount) {
    issues.push({
      category: 'completeness',
      severity: 'error',
      code: 'TX_COUNT_MISMATCH',
      message: `Transaction count mismatch: sources have ${sourceTxCount}, merged has ${mergedTxCount}`,
      details: { expected: sourceTxCount, actual: mergedTxCount }
    });
  }

  if (sourceStatements.length > 0 && mergedStatements.length > 0) {
    const firstSource = sourceStatements[0];
    const firstMerged = mergedStatements[0];

    if (firstSource.openingBalance.value !== firstMerged.openingBalance.value) {
      issues.push({
        category: 'completeness',
        severity: 'error',
        code: 'OPENING_BALANCE_MISMATCH',
        message: `Opening balance mismatch: expected ${firstSource.openingBalance.value}, got ${firstMerged.openingBalance.value}`,
        details: { expected: firstSource.openingBalance.value, actual: firstMerged.openingBalance.value }
      });
    }

    const lastSource = sourceStatements[sourceStatements.length - 1];
    const lastMerged = mergedStatements[mergedStatements.length - 1];

    if (lastSource.closingBalance.value !== lastMerged.closingBalance.value) {
      issues.push({
        category: 'completeness',
        severity: 'error',
        code: 'CLOSING_BALANCE_MISMATCH',
        message: `Closing balance mismatch: expected ${lastSource.closingBalance.value}, got ${lastMerged.closingBalance.value}`,
        details: { expected: lastSource.closingBalance.value, actual: lastMerged.closingBalance.value }
      });
    }
  }
}

function verifySyntax(content: string, issues: VerificationIssue[]): void {
  const lines = content.split(/\r?\n/);

  const requiredTags = [':20:', ':25:', ':28C:', ':60F:', ':62F:'];
  for (const tag of requiredTags) {
    if (!content.includes(tag)) {
      issues.push({
        category: 'syntax',
        severity: 'error',
        code: 'MISSING_TAG',
        message: `Missing required tag: ${tag}`,
        details: { tag }
      });
    }
  }

  const hasCRLF = content.includes('\r\n');
  if (!hasCRLF && content.includes('\n')) {
    issues.push({
      category: 'syntax',
      severity: 'warning',
      code: 'MISSING_CRLF',
      message: 'File uses LF instead of CRLF line endings',
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith(':86:') && line.length > 390) {
      issues.push({
        category: 'syntax',
        severity: 'warning',
        code: 'LINE_TOO_LONG',
        message: `Line ${i + 1} exceeds 390 characters (${line.length} chars)`,
        details: { line: i + 1, length: line.length }
      });
    }
  }
}

function verifyLogic(statements: ParsedStatement[], issues: VerificationIssue[]): void {
  const accounts = new Set(statements.map(s => s.accountId));
  if (accounts.size > 1) {
    issues.push({
      category: 'logic',
      severity: 'warning',
      code: 'MULTIPLE_ACCOUNTS',
      message: `Multiple accounts in merged file: ${Array.from(accounts).join(', ')}`,
      details: { accounts: Array.from(accounts) }
    });
  }

  for (const stmt of statements) {
    let runningBalance = stmt.openingBalance.value;
    const openingIsCredit = stmt.openingBalance.isCredit;

    for (const tx of stmt.transactions) {
      const signedAmount = tx.isCredit ? tx.amount : -tx.amount;
      runningBalance += signedAmount;
    }

    const expectedClosing = stmt.closingBalance.value;
    const closingIsCredit = stmt.closingBalance.isCredit;

    if (Math.abs(runningBalance - expectedClosing) > 0.01) {
      issues.push({
        category: 'logic',
        severity: 'error',
        code: 'BALANCE_CALCULATION_ERROR',
        message: `Balance calculation error in statement ${stmt.number}: expected ${expectedClosing}, calculated ${runningBalance.toFixed(2)}`,
        details: { statement: stmt.number, expected: expectedClosing, calculated: runningBalance }
      });
    }
  }

  for (let i = 1; i < statements.length; i++) {
    const prev = statements[i - 1];
    const curr = statements[i];

    if (Math.abs(prev.closingBalance.value - curr.openingBalance.value) > 0.01) {
      issues.push({
        category: 'logic',
        severity: 'error',
        code: 'BALANCE_DISCONTINUITY',
        message: `Balance discontinuity between statements ${prev.number} and ${curr.number}: closing ${prev.closingBalance.value} != opening ${curr.openingBalance.value}`,
        details: { prevStatement: prev.number, currStatement: curr.number }
      });
    }
  }
}

function verifyFidelity(content: string, issues: VerificationIssue[]): void {
  const md5Pattern = /^[a-f0-9]{32}$/;
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (md5Pattern.test(line)) {
      issues.push({
        category: 'fidelity',
        severity: 'error',
        code: 'FALSE_SUPPLEMENTARY_LINE',
        message: `Possible MD5 hash as false supplementary line at line ${i + 1}: ${line}`,
        details: { line: i + 1, content: line }
      });
    }
  }

  if (content.includes(':20:STARTUMS')) {
    const sourceRefs = content.match(/:20:([^\r\n]+)/g) || [];
    const allStartums = sourceRefs.every(r => r.includes('STARTUMS'));
    if (allStartums && sourceRefs.length > 0) {
      issues.push({
        category: 'fidelity',
        severity: 'warning',
        code: 'GENERIC_REFERENCE',
        message: 'All :20: references are STARTUMS - original references may have been lost',
      });
    }
  }
}

async function main(): Promise<void> {
  const { zip, merged, output } = parseArgs();

  if (!existsSync(zip)) {
    console.error(`Error: ZIP file not found: ${zip}`);
    process.exit(1);
  }

  if (!existsSync(merged)) {
    console.error(`Error: Merged file not found: ${merged}`);
    process.exit(1);
  }

  console.log(`Verifying merge...`);
  console.log(`  Sources: ${zip}`);
  console.log(`  Merged:  ${merged}`);
  console.log('');

  const issues: VerificationIssue[] = [];

  const sourceFiles = await extractMT940FromZip(zip);
  console.log(`Found ${sourceFiles.size} MT940 files in ZIP`);

  const allSourceStatements: ParsedStatement[] = [];
  for (const [name, content] of sourceFiles) {
    try {
      const statements = await parseMT940(content);
      allSourceStatements.push(...statements);
      console.log(`  ${name}: ${statements.length} statement(s), ${statements.reduce((s, st) => s + st.transactions.length, 0)} transaction(s)`);
    } catch (err) {
      issues.push({
        category: 'syntax',
        severity: 'error',
        code: 'PARSE_ERROR',
        message: `Failed to parse source file ${name}: ${err instanceof Error ? err.message : String(err)}`,
        details: { file: name }
      });
    }
  }

  const mergedContent = readFileSync(resolve(merged), 'utf-8');
  let mergedStatements: ParsedStatement[] = [];

  try {
    mergedStatements = await parseMT940(mergedContent);
    console.log(`\nMerged file: ${mergedStatements.length} statement(s), ${mergedStatements.reduce((s, st) => s + st.transactions.length, 0)} transaction(s)`);
  } catch (err) {
    issues.push({
      category: 'syntax',
      severity: 'error',
      code: 'PARSE_ERROR',
      message: `Failed to parse merged file: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  console.log('\nRunning verification checks...');

  verifyCompleteness(allSourceStatements, mergedStatements, issues);
  verifySyntax(mergedContent, issues);
  verifyLogic(mergedStatements, issues);
  verifyFidelity(mergedContent, issues);

  const report: VerificationReport = {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    sourceFiles: sourceFiles.size,
    sourceTransactions: allSourceStatements.reduce((s, st) => s + st.transactions.length, 0),
    mergedTransactions: mergedStatements.reduce((s, st) => s + st.transactions.length, 0),
    issues,
    timestamp: new Date().toISOString(),
  };

  console.log('');

  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  if (errors.length > 0) {
    console.log(`ERRORS (${errors.length}):`);
    for (const issue of errors) {
      console.log(`  [${issue.code}] ${issue.message}`);
    }
  }

  if (warnings.length > 0) {
    console.log(`\nWARNINGS (${warnings.length}):`);
    for (const issue of warnings) {
      console.log(`  [${issue.code}] ${issue.message}`);
    }
  }

  if (output) {
    writeFileSync(resolve(output), JSON.stringify(report, null, 2));
    console.log(`\nReport written to: ${output}`);
  }

  console.log('');
  if (report.valid) {
    console.log('✓ Merge verification PASSED');
    process.exit(0);
  } else {
    console.log('✗ Merge verification FAILED');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
