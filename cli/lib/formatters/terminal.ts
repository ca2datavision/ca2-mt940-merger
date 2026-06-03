/**
 * Terminal Formatter
 * Outputs MT940 explanation with ANSI colors and tree structure.
 */

import pc from 'picocolors';
import type { ParsedLine, DecodedTag, DecodedTransaction, DecodedBalance } from '../decoder.js';
import type { Formatter, FormatterOptions, DocumentSummary } from './types.js';
import { stripAnsi } from '../ansi.js';

interface ColorFunctions {
  cyan: (s: string) => string;
  yellow: (s: string) => string;
  red: (s: string) => string;
  green: (s: string) => string;
  dim: (s: string) => string;
  bold: (s: string) => string;
  magenta: (s: string) => string;
}

function getColors(enabled: boolean): ColorFunctions {
  if (enabled) {
    return {
      cyan: pc.cyan,
      yellow: pc.yellow,
      red: pc.red,
      green: pc.green,
      dim: pc.dim,
      bold: pc.bold,
      magenta: pc.magenta,
    };
  }
  const identity = (s: string) => s;
  return {
    cyan: identity,
    yellow: identity,
    red: identity,
    green: identity,
    dim: identity,
    bold: identity,
    magenta: identity,
  };
}

function formatDecodedFields(decoded: DecodedTag, c: ColorFunctions): string[] {
  const lines: string[] = [];
  const fields = decoded.fields;

  if (decoded.tag === '61') {
    const tx = fields as unknown as DecodedTransaction;
    lines.push(`├── Value Date: ${c.cyan(tx.valueDateFormatted || 'N/A')}`);
    if (tx.entryDateFormatted) {
      lines.push(`├── Entry Date: ${c.cyan(tx.entryDateFormatted)}`);
    }
    const direction = tx.isDebit ? 'D = Debit (money out)' : 'C = Credit (money in)';
    const dirColor = tx.isDebit ? c.red : c.green;
    lines.push(`├── Direction: ${dirColor(direction)}${tx.isReversal ? c.yellow(' [REVERSAL]') : ''}`);
    lines.push(`├── Amount: ${c.bold(tx.amount || 'N/A')}`);
    if (tx.transactionType) {
      const typeDesc = `${tx.transactionType.prefix}${tx.transactionType.code} = ${tx.transactionType.prefixMeaning} ${tx.transactionType.name}`;
      lines.push(`├── Type: ${c.magenta(typeDesc)}`);
    }
    lines.push(`├── Customer Ref: ${stripAnsi(tx.customerReference || '') || 'N/A'}`);
    if (tx.bankReference) {
      lines.push(`├── Bank Ref: ${stripAnsi(tx.bankReference)}`);
    }
    if (tx.supplementary) {
      lines.push(`├── Supplementary: ${c.dim(stripAnsi(tx.supplementary))}`);
    }
  } else if (['60F', '60M', '62F', '62M', '64', '65'].includes(decoded.tag)) {
    const bal = fields as unknown as DecodedBalance;
    const direction = bal.isDebit ? 'Debit (negative)' : 'Credit (positive)';
    const dirColor = bal.isDebit ? c.red : c.green;
    lines.push(`├── Date: ${c.cyan(bal.dateFormatted || 'N/A')}`);
    lines.push(`├── Direction: ${dirColor(direction)}`);
    lines.push(`├── Currency: ${stripAnsi(bal.currency || '') || 'N/A'}`);
    lines.push(`├── Amount: ${c.bold(stripAnsi(bal.amount || '') || 'N/A')}`);
  } else if (decoded.tag === '25') {
    lines.push(`├── Account: ${c.cyan(stripAnsi(String(fields.accountId || '')) || 'N/A')}`);
    if (fields.bic) {
      lines.push(`├── BIC: ${stripAnsi(String(fields.bic))}`);
    }
  } else if (decoded.tag === '28C') {
    lines.push(`├── Statement Number: ${stripAnsi(String(fields.statementNumber || '')) || 'N/A'}`);
    if (fields.sequenceNumber) {
      lines.push(`├── Sequence: ${stripAnsi(String(fields.sequenceNumber))}`);
    }
  } else if (decoded.tag === '86') {
    if (fields.hasSubfields && fields.subfields) {
      const subfields = fields.subfields as Record<string, string>;
      for (const [code, value] of Object.entries(subfields)) {
        lines.push(`├── ${c.dim(`[${stripAnsi(code)}]`)} ${stripAnsi(value)}`);
      }
    } else {
      const narrative = stripAnsi(String(fields.rawNarrative || ''));
      const truncated = narrative.length > 80 ? narrative.slice(0, 80) + '...' : narrative;
      lines.push(`├── Narrative: ${c.dim(truncated)}`);
    }
  } else {
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && typeof value !== 'object') {
        lines.push(`├── ${key}: ${stripAnsi(String(value))}`);
      }
    }
  }

  return lines;
}

function formatIssues(issues: DecodedTag['issues'], c: ColorFunctions): string[] {
  return issues.map(issue => {
    const icon = issue.severity === 'error' ? '✗' : issue.severity === 'warning' ? '⚠' : 'ℹ';
    const color = issue.severity === 'error' ? c.red : issue.severity === 'warning' ? c.yellow : c.dim;
    return `├── ${color(`${icon} ${issue.message}`)}`;
  });
}

function formatLine(line: ParsedLine, c: ColorFunctions, options: FormatterOptions): string[] {
  const output: string[] = [];
  const lineNum = options.showLineNumbers !== false ? `LINE ${line.lineNumber}: ` : '';

  if (line.isStatementSeparator) {
    output.push('');
    output.push(c.dim('─'.repeat(60)));
    output.push(c.bold('END OF STATEMENT'));
    output.push(c.dim('─'.repeat(60)));
    return output;
  }

  if (!line.decoded) {
    if (line.isContinuation) {
      output.push(`${c.dim(lineNum)}${c.dim('(continuation)')} ${stripAnsi(line.raw)}`);
    } else if (line.raw.trim()) {
      output.push(`${c.dim(lineNum)}${stripAnsi(line.raw)}`);
    }
    return output;
  }

  const decoded = line.decoded;
  const tagDisplay = c.cyan(`:${decoded.tag}:`);

  if (options.showRawLines !== false) {
    output.push(`${c.bold(lineNum)}${stripAnsi(line.raw)}`);
  }

  output.push(`├── Tag: ${tagDisplay} ${c.bold(decoded.tagName)}`);

  const fieldLines = formatDecodedFields(decoded, c);
  output.push(...fieldLines);

  if (decoded.issues.length > 0) {
    output.push(...formatIssues(decoded.issues, c));
  }

  const lastIdx = output.length - 1;
  if (output[lastIdx]?.startsWith('├──')) {
    output[lastIdx] = output[lastIdx].replace('├──', '└──');
  }

  output.push('');

  return output;
}

function formatSummaryHeader(summary: DocumentSummary, c: ColorFunctions): string[] {
  const lines: string[] = [];

  lines.push(c.bold('═'.repeat(60)));
  lines.push(c.bold('              MT940 FILE EXPLANATION'));
  lines.push(c.bold('═'.repeat(60)));
  lines.push('');

  if (summary.fileName) {
    lines.push(`File: ${c.cyan(summary.fileName)}`);
  }
  lines.push(`Lines: ${summary.lineCount}`);
  lines.push(`Statements: ${summary.statementCount}`);
  lines.push(`Transactions: ${summary.transactionCount}`);

  if (summary.errorCount > 0) {
    lines.push(`Errors: ${c.red(String(summary.errorCount))}`);
  }
  if (summary.warningCount > 0) {
    lines.push(`Warnings: ${c.yellow(String(summary.warningCount))}`);
  }

  lines.push('');
  lines.push(c.dim('─'.repeat(60)));
  lines.push('');

  return lines;
}

export const terminalFormatter: Formatter = {
  format(lines: ParsedLine[], options: FormatterOptions = {}): string {
    const c = getColors(options.color !== false);
    const output: string[] = [];

    for (const line of lines) {
      output.push(...formatLine(line, c, options));
    }

    return output.join('\n');
  },

  formatWithSummary(lines: ParsedLine[], summary: DocumentSummary, options: FormatterOptions = {}): string {
    const c = getColors(options.color !== false);
    const output: string[] = [];

    output.push(...formatSummaryHeader(summary, c));

    for (const line of lines) {
      output.push(...formatLine(line, c, options));
    }

    output.push(c.bold('═'.repeat(60)));

    return output.join('\n');
  },
};

export default terminalFormatter;
