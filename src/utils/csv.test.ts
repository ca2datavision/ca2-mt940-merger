import { describe, it, expect } from 'vitest';
import { escapeCSVField, rowToCSV, toCSV, BASIC_HEADERS, ENHANCED_HEADERS } from './csv';

describe('escapeCSVField', () => {
  it('returns plain strings unchanged', () => {
    expect(escapeCSVField('hello')).toBe('hello');
  });

  it('quotes fields containing commas', () => {
    expect(escapeCSVField('hello, world')).toBe('"hello, world"');
  });

  it('doubles quotes and wraps in quotes', () => {
    expect(escapeCSVField('say "hello"')).toBe('"say ""hello"""');
  });

  it('quotes fields containing newlines', () => {
    expect(escapeCSVField('line1\nline2')).toBe('"line1\nline2"');
  });

  it('handles null and undefined', () => {
    expect(escapeCSVField(null)).toBe('');
    expect(escapeCSVField(undefined)).toBe('');
  });

  it('converts numbers to strings', () => {
    expect(escapeCSVField(123.45)).toBe('123.45');
  });
});

describe('rowToCSV', () => {
  it('joins values with commas', () => {
    expect(rowToCSV({ a: 'foo', b: 'bar' })).toBe('foo,bar');
  });

  it('escapes values as needed', () => {
    expect(rowToCSV({ a: 'foo', b: 'bar, baz' })).toBe('foo,"bar, baz"');
  });
});

describe('toCSV', () => {
  it('generates valid CSV with headers and rows', () => {
    const headers = ['name', 'value'];
    const rows = [{ name: 'test', value: 100 }];
    expect(toCSV(headers, rows)).toBe('name,value\ntest,100');
  });

  it('escapes headers with special chars', () => {
    const headers = ['name, full'];
    const rows = [{ name: 'x' }];
    expect(toCSV(headers, rows)).toBe('"name, full"\nx');
  });
});

describe('formula injection prevention', () => {
  it('prefixes = with single quote', () => {
    expect(escapeCSVField('=SUM(A1)')).toBe("\"'=SUM(A1)\"");
  });

  it('prefixes + with single quote', () => {
    expect(escapeCSVField('+100')).toBe("\"'+100\"");
  });

  it('prefixes - with single quote', () => {
    expect(escapeCSVField('-100')).toBe("\"'-100\"");
  });

  it('prefixes @ with single quote', () => {
    expect(escapeCSVField('@SUM')).toBe("\"'@SUM\"");
  });

  it('allows formula prefixes when prevention disabled', () => {
    expect(escapeCSVField('=SUM(A1)', false)).toBe('=SUM(A1)');
    expect(escapeCSVField('-100', false)).toBe('-100');
  });
});

describe('CSV headers', () => {
  it('has 12 basic headers', () => {
    expect(BASIC_HEADERS).toHaveLength(12);
  });

  it('has 19 enhanced headers', () => {
    expect(ENHANCED_HEADERS).toHaveLength(19);
  });
});
