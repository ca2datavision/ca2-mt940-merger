/**
 * JSON Formatter
 * Machine-readable output with raw lines for traceability.
 */

import type { ParsedLine } from '../decoder.js';
import type { Formatter, FormatterOptions, DocumentSummary } from './types.js';

interface JsonLine {
  lineNumber: number;
  raw: string;
  type: 'tag' | 'continuation' | 'separator' | 'empty' | 'unknown';
  tag?: string;
  tagName?: string;
  fields?: Record<string, unknown>;
  issues?: Array<{
    severity: string;
    message: string;
    field?: string;
  }>;
}

interface JsonOutput {
  summary?: {
    fileName?: string;
    lineCount: number;
    statementCount: number;
    transactionCount: number;
    errorCount: number;
    warningCount: number;
  };
  lines: JsonLine[];
  issues?: Array<{
    severity: string;
    message: string;
    field?: string;
    lineNumber?: number;
  }>;
}

function convertLine(line: ParsedLine): JsonLine {
  const result: JsonLine = {
    lineNumber: line.lineNumber,
    raw: line.raw,
    type: 'unknown',
  };

  if (line.isStatementSeparator) {
    result.type = 'separator';
    return result;
  }

  if (!line.raw.trim()) {
    result.type = 'empty';
    return result;
  }

  if (line.isContinuation) {
    result.type = 'continuation';
    return result;
  }

  if (line.decoded) {
    result.type = 'tag';
    result.tag = line.decoded.tag;
    result.tagName = line.decoded.tagName;
    result.fields = { ...line.decoded.fields };

    if (line.decoded.issues.length > 0) {
      result.issues = line.decoded.issues.map(i => ({
        severity: i.severity,
        message: i.message,
        field: i.field,
      }));
    }
  }

  return result;
}

export const jsonFormatter: Formatter = {
  format(lines: ParsedLine[], _options: FormatterOptions = {}): string {
    const output: JsonOutput = {
      lines: lines.map(convertLine),
    };

    const allIssues = lines
      .filter(l => l.decoded?.issues?.length)
      .flatMap(l => l.decoded!.issues.map(i => ({
        ...i,
        lineNumber: l.lineNumber,
      })));

    if (allIssues.length > 0) {
      output.issues = allIssues;
    }

    return JSON.stringify(output, null, 2);
  },

  formatWithSummary(lines: ParsedLine[], summary: DocumentSummary, options: FormatterOptions = {}): string {
    const output: JsonOutput = {
      summary: {
        fileName: summary.fileName,
        lineCount: summary.lineCount,
        statementCount: summary.statementCount,
        transactionCount: summary.transactionCount,
        errorCount: summary.errorCount,
        warningCount: summary.warningCount,
      },
      lines: lines.map(convertLine),
    };

    const allIssues = lines
      .filter(l => l.decoded?.issues?.length)
      .flatMap(l => l.decoded!.issues.map(i => ({
        ...i,
        lineNumber: l.lineNumber,
      })));

    if (allIssues.length > 0) {
      output.issues = allIssues;
    }

    return JSON.stringify(output, null, 2);
  },
};

export default jsonFormatter;
