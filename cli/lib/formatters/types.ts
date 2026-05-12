/**
 * Output Formatter Types
 */

import type { ParsedLine, ValidationIssue } from '../decoder.js';

export type OutputFormat = 'terminal' | 'html' | 'json';

export interface FormatterOptions {
  color?: boolean;
  showRawLines?: boolean;
  showLineNumbers?: boolean;
}

export interface FormatResult {
  output: string;
  format: OutputFormat;
}

export interface DocumentSummary {
  fileName?: string;
  lineCount: number;
  statementCount: number;
  transactionCount: number;
  errorCount: number;
  warningCount: number;
  issues: ValidationIssue[];
}

export interface Formatter {
  format(lines: ParsedLine[], options?: FormatterOptions): string;
  formatWithSummary(lines: ParsedLine[], summary: DocumentSummary, options?: FormatterOptions): string;
}

export function detectFormatFromPath(path: string): OutputFormat {
  const ext = path.toLowerCase().split('.').pop();
  switch (ext) {
    case 'html':
    case 'htm':
      return 'html';
    case 'json':
      return 'json';
    default:
      return 'terminal';
  }
}

export function createSummary(lines: ParsedLine[], fileName?: string): DocumentSummary {
  let statementCount = 0;
  let transactionCount = 0;
  let errorCount = 0;
  let warningCount = 0;
  const issues: ValidationIssue[] = [];

  for (const line of lines) {
    if (line.isStatementSeparator) {
      statementCount++;
    }
    if (line.decoded?.tag === '61') {
      transactionCount++;
    }
    if (line.decoded?.issues) {
      for (const issue of line.decoded.issues) {
        issues.push(issue);
        if (issue.severity === 'error') {
          errorCount++;
        } else if (issue.severity === 'warning') {
          warningCount++;
        }
      }
    }
  }

  if (statementCount === 0 && lines.some(l => l.decoded?.tag === '20')) {
    statementCount = 1;
  }

  return {
    fileName,
    lineCount: lines.length,
    statementCount,
    transactionCount,
    errorCount,
    warningCount,
    issues,
  };
}
