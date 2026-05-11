import type { ValidationResult, ValidationIssue, Statement, BatchSummary, InputFile, MergeEligibility } from '../types/validation';
import type { MT940File } from '../stores/FileStore';
import Decimal from 'decimal.js';

function serializeDecimal(value: Decimal | string | number): string {
  if (value instanceof Decimal) {
    return value.toString();
  }
  return String(value);
}

function serializeStatement(stmt: Statement): Record<string, unknown> {
  return {
    ...stmt,
    openingBalance: {
      ...stmt.openingBalance,
      amount: serializeDecimal(stmt.openingBalance.amount),
    },
    closingBalance: {
      ...stmt.closingBalance,
      amount: serializeDecimal(stmt.closingBalance.amount),
    },
    transactions: stmt.transactions.map(txn => ({
      ...txn,
      amount: serializeDecimal(txn.amount),
    })),
  };
}

export function buildValidationResult(
  files: MT940File[],
  batchIssues: ValidationIssue[]
): ValidationResult {
  const allStatements: Statement[] = [];
  const inputFiles: InputFile[] = [];

  for (const file of files) {
    if (file.statements) {
      allStatements.push(...file.statements);
    }

    inputFiles.push({
      id: file.id,
      name: file.name,
      hash: file.contentHash,
      size: 0,
      encoding: 'utf-8',
      statementCount: file.statements?.length ?? 0,
      transactionCount: file.statements?.reduce((sum, s) => sum + s.transactions.length, 0) ?? 0,
    });
  }

  const allIssues = [
    ...batchIssues,
    ...files.flatMap(f => f.validationIssues ?? []),
  ];

  const accounts = [...new Set(allStatements.map(s => s.accountId))];
  const currencies = [...new Set(allStatements.map(s => s.openingBalance.currency))];

  let earliest = '';
  let latest = '';
  for (const stmt of allStatements) {
    for (const txn of stmt.transactions) {
      if (!earliest || txn.entryDate < earliest) earliest = txn.entryDate;
      if (!latest || txn.entryDate > latest) latest = txn.entryDate;
    }
  }

  const totalTransactions = allStatements.reduce((sum, s) => sum + s.transactions.length, 0);
  const errors = allIssues.filter(i => i.severity === 'error');
  const warnings = allIssues.filter(i => i.severity === 'warning');

  const batchSummary: BatchSummary = {
    totalFiles: files.length,
    totalStatements: allStatements.length,
    totalTransactions,
    uniqueTransactions: totalTransactions,
    duplicateTransactions: 0,
    accounts,
    dateRange: { earliest, latest },
    currencies,
  };

  const mergeEligibility: MergeEligibility = {
    eligible: errors.length === 0,
    reason: errors.length > 0 ? `${errors.length} validation error(s) found` : undefined,
    blockers: errors,
    warnings,
  };

  return {
    batchSummary,
    inputFiles,
    parsedStatements: allStatements,
    issues: allIssues,
    mergeEligibility,
    validatedAt: new Date().toISOString(),
  };
}

export function validationResultToJSON(result: ValidationResult): string {
  const serialized = {
    ...result,
    parsedStatements: result.parsedStatements.map(serializeStatement),
  };
  return JSON.stringify(serialized, null, 2);
}

export function generateValidationReport(result: ValidationResult): string {
  const lines: string[] = [];
  const { batchSummary: summary, issues, mergeEligibility } = result;

  lines.push('# MT940 Validation Report');
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push('');

  lines.push('## Summary');
  lines.push(`- Files: ${summary.totalFiles}`);
  lines.push(`- Statements: ${summary.totalStatements}`);
  lines.push(`- Transactions: ${summary.totalTransactions}`);
  lines.push(`- Accounts: ${summary.accounts.join(', ') || 'None'}`);
  lines.push(`- Currencies: ${summary.currencies.join(', ') || 'None'}`);
  if (summary.dateRange.earliest) {
    lines.push(`- Date Range: ${summary.dateRange.earliest} to ${summary.dateRange.latest}`);
  }
  lines.push('');

  lines.push('## Merge Assessment');
  lines.push(mergeEligibility.eligible ? '✓ Ready to merge' : '✗ Cannot merge');
  if (mergeEligibility.reason) {
    lines.push(`  Reason: ${mergeEligibility.reason}`);
  }
  lines.push('');

  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const infos = issues.filter(i => i.severity === 'info');

  if (errors.length > 0) {
    lines.push('## Errors');
    for (const issue of errors) {
      const loc = issue.fileName ? ` (${issue.fileName}${issue.lineNumber ? ':' + issue.lineNumber : ''})` : '';
      lines.push(`- [${issue.code}]${loc} ${issue.message}`);
    }
    lines.push('');
  }

  if (warnings.length > 0) {
    lines.push('## Warnings');
    for (const issue of warnings) {
      const loc = issue.fileName ? ` (${issue.fileName}${issue.lineNumber ? ':' + issue.lineNumber : ''})` : '';
      lines.push(`- [${issue.code}]${loc} ${issue.message}`);
    }
    lines.push('');
  }

  if (infos.length > 0) {
    lines.push('## Info');
    for (const issue of infos) {
      const loc = issue.fileName ? ` (${issue.fileName}${issue.lineNumber ? ':' + issue.lineNumber : ''})` : '';
      lines.push(`- [${issue.code}]${loc} ${issue.message}`);
    }
    lines.push('');
  }

  if (issues.length === 0) {
    lines.push('## Validation Result');
    lines.push('No issues found.');
    lines.push('');
  }

  return lines.join('\n');
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
