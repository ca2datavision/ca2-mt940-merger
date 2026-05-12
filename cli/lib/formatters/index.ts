/**
 * Output Formatters Index
 */

export type { OutputFormat, FormatterOptions, FormatResult, DocumentSummary, Formatter } from './types.js';
export { detectFormatFromPath, createSummary } from './types.js';
export { terminalFormatter } from './terminal.js';
export { htmlFormatter } from './html.js';
export { jsonFormatter } from './json.js';

import type { ParsedLine } from '../decoder.js';
import type { OutputFormat, FormatterOptions, DocumentSummary, Formatter } from './types.js';
import { terminalFormatter } from './terminal.js';
import { htmlFormatter } from './html.js';
import { jsonFormatter } from './json.js';

const formatters: Record<OutputFormat, Formatter> = {
  terminal: terminalFormatter,
  html: htmlFormatter,
  json: jsonFormatter,
};

export function getFormatter(format: OutputFormat): Formatter {
  return formatters[format] || terminalFormatter;
}

export function format(
  lines: ParsedLine[],
  outputFormat: OutputFormat = 'terminal',
  options: FormatterOptions = {}
): string {
  const formatter = getFormatter(outputFormat);
  return formatter.format(lines, options);
}

export function formatWithSummary(
  lines: ParsedLine[],
  summary: DocumentSummary,
  outputFormat: OutputFormat = 'terminal',
  options: FormatterOptions = {}
): string {
  const formatter = getFormatter(outputFormat);
  return formatter.formatWithSummary(lines, summary, options);
}
