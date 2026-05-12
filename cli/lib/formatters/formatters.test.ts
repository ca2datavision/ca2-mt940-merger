import { describe, it, expect } from 'vitest';
import { parseLines } from '../decoder.js';
import {
  terminalFormatter,
  htmlFormatter,
  jsonFormatter,
  detectFormatFromPath,
  createSummary,
  getFormatter,
  format,
  formatWithSummary,
} from './index.js';

const sampleMT940 = `:20:STARTUMS
:25:RO49AAAA1B31007593840000
:28C:1/1
:60F:C240101EUR1000,00
:61:240115D100,00NTRFREF001
:86:Payment description
:62F:C240131EUR900,00
-`;

describe('Terminal Formatter', () => {
  it('formats parsed lines with tree structure', () => {
    const lines = parseLines(sampleMT940);
    const output = terminalFormatter.format(lines, { color: false });

    expect(output).toContain('LINE 1:');
    expect(output).toContain(':20:');
    expect(output).toContain('Transaction Reference');
    expect(output).toContain('├──');
    expect(output).toContain('└──');
  });

  it('includes raw lines by default', () => {
    const lines = parseLines(sampleMT940);
    const output = terminalFormatter.format(lines, { color: false });

    expect(output).toContain(':20:STARTUMS');
    expect(output).toContain(':60F:C240101EUR1000,00');
  });

  it('shows debit/credit direction', () => {
    const lines = parseLines(sampleMT940);
    const output = terminalFormatter.format(lines, { color: false });

    expect(output).toContain('D = Debit');
    expect(output).toContain('Credit');
  });

  it('shows statement separator', () => {
    const lines = parseLines(sampleMT940);
    const output = terminalFormatter.format(lines, { color: false });

    expect(output).toContain('END OF STATEMENT');
  });

  it('formats with summary header', () => {
    const lines = parseLines(sampleMT940);
    const summary = createSummary(lines, 'test.mt940');
    const output = terminalFormatter.formatWithSummary(lines, summary, { color: false });

    expect(output).toContain('MT940 FILE EXPLANATION');
    expect(output).toContain('File: test.mt940');
    expect(output).toContain('Statements:');
    expect(output).toContain('Transactions:');
  });

  it('works with colors enabled', () => {
    const lines = parseLines(sampleMT940);
    const output = terminalFormatter.format(lines, { color: true });

    expect(output.length).toBeGreaterThan(0);
  });
});

describe('HTML Formatter', () => {
  it('generates valid HTML document', () => {
    const lines = parseLines(sampleMT940);
    const output = htmlFormatter.format(lines);

    expect(output).toContain('<!DOCTYPE html>');
    expect(output).toContain('<html');
    expect(output).toContain('</html>');
    expect(output).toContain('<style>');
  });

  it('is self-contained with inline CSS', () => {
    const lines = parseLines(sampleMT940);
    const output = htmlFormatter.format(lines);

    expect(output).toContain('<style>');
    expect(output).not.toContain('href=');
    expect(output).not.toContain('link rel="stylesheet"');
  });

  it('includes collapsible sections', () => {
    const lines = parseLines(sampleMT940);
    const output = htmlFormatter.format(lines);

    expect(output).toContain('statement-header');
    expect(output).toContain('statement-content');
    expect(output).toContain('toggle');
    expect(output).toContain('<script>');
  });

  it('escapes HTML content (XSS-safe)', () => {
    const maliciousMT940 = `:20:<script>alert('xss')</script>
:25:ACC123
:60F:C240101EUR100,00
:62F:C240131EUR100,00
-`;
    const lines = parseLines(maliciousMT940);
    const output = htmlFormatter.format(lines);

    expect(output).not.toContain("<script>alert('xss')</script>");
    expect(output).toContain('&lt;script&gt;');
  });

  it('has print-friendly styling', () => {
    const lines = parseLines(sampleMT940);
    const output = htmlFormatter.format(lines);

    expect(output).toContain('@media print');
  });

  it('includes summary header', () => {
    const lines = parseLines(sampleMT940);
    const summary = createSummary(lines, 'test.mt940');
    const output = htmlFormatter.formatWithSummary(lines, summary);

    expect(output).toContain('test.mt940');
    expect(output).toContain('stat-value');
    expect(output).toContain('Statements');
  });
});

describe('JSON Formatter', () => {
  it('outputs valid JSON', () => {
    const lines = parseLines(sampleMT940);
    const output = jsonFormatter.format(lines);

    expect(() => JSON.parse(output)).not.toThrow();
  });

  it('includes all parsed lines', () => {
    const lines = parseLines(sampleMT940);
    const output = jsonFormatter.format(lines);
    const parsed = JSON.parse(output);

    expect(parsed.lines).toHaveLength(lines.length);
  });

  it('includes line numbers and raw content', () => {
    const lines = parseLines(sampleMT940);
    const output = jsonFormatter.format(lines);
    const parsed = JSON.parse(output);

    expect(parsed.lines[0].lineNumber).toBe(1);
    expect(parsed.lines[0].raw).toBe(':20:STARTUMS');
  });

  it('includes decoded tag info', () => {
    const lines = parseLines(sampleMT940);
    const output = jsonFormatter.format(lines);
    const parsed = JSON.parse(output);

    const tag20Line = parsed.lines.find((l: { tag?: string }) => l.tag === '20');
    expect(tag20Line).toBeDefined();
    expect(tag20Line.tagName).toBe('Transaction Reference Number');
    expect(tag20Line.fields).toBeDefined();
  });

  it('includes summary when requested', () => {
    const lines = parseLines(sampleMT940);
    const summary = createSummary(lines, 'test.mt940');
    const output = jsonFormatter.formatWithSummary(lines, summary);
    const parsed = JSON.parse(output);

    expect(parsed.summary).toBeDefined();
    expect(parsed.summary.fileName).toBe('test.mt940');
    expect(parsed.summary.lineCount).toBe(lines.length);
  });

  it('includes issues array when present', () => {
    const badMT940 = `:20:
:25:ACC
:60F:INVALID
:62F:C240131EUR100,00
-`;
    const lines = parseLines(badMT940);
    const output = jsonFormatter.format(lines);
    const parsed = JSON.parse(output);

    expect(parsed.issues).toBeDefined();
    expect(parsed.issues.length).toBeGreaterThan(0);
  });
});

describe('Format Detection', () => {
  it('detects HTML from .html extension', () => {
    expect(detectFormatFromPath('report.html')).toBe('html');
    expect(detectFormatFromPath('output.HTML')).toBe('html');
    expect(detectFormatFromPath('/path/to/file.htm')).toBe('html');
  });

  it('detects JSON from .json extension', () => {
    expect(detectFormatFromPath('data.json')).toBe('json');
    expect(detectFormatFromPath('output.JSON')).toBe('json');
  });

  it('defaults to terminal for other extensions', () => {
    expect(detectFormatFromPath('report.txt')).toBe('terminal');
    expect(detectFormatFromPath('output')).toBe('terminal');
    expect(detectFormatFromPath('file.mt940')).toBe('terminal');
  });
});

describe('Summary Creation', () => {
  it('counts statements correctly', () => {
    const lines = parseLines(sampleMT940);
    const summary = createSummary(lines);

    expect(summary.statementCount).toBe(1);
  });

  it('counts transactions correctly', () => {
    const lines = parseLines(sampleMT940);
    const summary = createSummary(lines);

    expect(summary.transactionCount).toBe(1);
  });

  it('counts errors and warnings', () => {
    const badMT940 = `:20:
:25:ACC
:60F:INVALID
:62F:C240131EUR100,00
-`;
    const lines = parseLines(badMT940);
    const summary = createSummary(lines);

    expect(summary.errorCount).toBeGreaterThan(0);
  });

  it('includes file name when provided', () => {
    const lines = parseLines(sampleMT940);
    const summary = createSummary(lines, 'test.mt940');

    expect(summary.fileName).toBe('test.mt940');
  });
});

describe('Formatter Registry', () => {
  it('returns terminal formatter for terminal format', () => {
    const formatter = getFormatter('terminal');
    expect(formatter).toBe(terminalFormatter);
  });

  it('returns html formatter for html format', () => {
    const formatter = getFormatter('html');
    expect(formatter).toBe(htmlFormatter);
  });

  it('returns json formatter for json format', () => {
    const formatter = getFormatter('json');
    expect(formatter).toBe(jsonFormatter);
  });
});

describe('Convenience Functions', () => {
  it('format() produces terminal output by default', () => {
    const lines = parseLines(sampleMT940);
    const output = format(lines);

    expect(output).toContain('LINE');
    expect(output).toContain('├──');
  });

  it('format() produces HTML when specified', () => {
    const lines = parseLines(sampleMT940);
    const output = format(lines, 'html');

    expect(output).toContain('<!DOCTYPE html>');
  });

  it('formatWithSummary() includes summary', () => {
    const lines = parseLines(sampleMT940);
    const summary = createSummary(lines, 'test.mt940');
    const output = formatWithSummary(lines, summary, 'terminal', { color: false });

    expect(output).toContain('test.mt940');
    expect(output).toContain('MT940 FILE EXPLANATION');
  });
});
