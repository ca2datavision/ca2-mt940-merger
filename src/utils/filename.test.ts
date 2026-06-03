import { describe, it, expect } from 'vitest';
import { sanitizeFilename } from './filename';

describe('sanitizeFilename', () => {
  describe('basic functionality', () => {
    it('returns simple names unchanged', () => {
      expect(sanitizeFilename('report')).toBe('report');
      expect(sanitizeFilename('transactions_2024')).toBe('transactions_2024');
    });

    it('returns fallback for empty input', () => {
      expect(sanitizeFilename('')).toBe('export');
      expect(sanitizeFilename('', 'default')).toBe('default');
    });

    it('returns fallback for null/undefined', () => {
      expect(sanitizeFilename(null as unknown as string)).toBe('export');
      expect(sanitizeFilename(undefined as unknown as string)).toBe('export');
    });
  });

  describe('unsafe character handling', () => {
    it('replaces forward slash', () => {
      expect(sanitizeFilename('RO49/BTRL/1234')).toBe('RO49_BTRL_1234');
    });

    it('replaces backslash', () => {
      expect(sanitizeFilename('RO49\\BTRL\\1234')).toBe('RO49_BTRL_1234');
    });

    it('replaces colon', () => {
      expect(sanitizeFilename('account:12345')).toBe('account_12345');
    });

    it('replaces angle brackets', () => {
      expect(sanitizeFilename('file<1>name')).toBe('file_1_name');
    });

    it('replaces pipe and question mark', () => {
      expect(sanitizeFilename('what|is?this')).toBe('what_is_this');
    });

    it('replaces asterisk', () => {
      expect(sanitizeFilename('file*.txt')).toBe('file_.txt');
    });

    it('replaces double quotes', () => {
      expect(sanitizeFilename('file"name"')).toBe('file_name_');
    });

    it('replaces control characters', () => {
      expect(sanitizeFilename('file\x00name\x1f')).toBe('file_name_');
    });

    it('handles multiple unsafe chars together', () => {
      expect(sanitizeFilename('a/b\\c:d<e>f')).toBe('a_b_c_d_e_f');
    });
  });

  describe('underscore collapsing', () => {
    it('collapses multiple underscores', () => {
      expect(sanitizeFilename('a___b')).toBe('a_b');
    });

    it('collapses underscores from multiple replacements', () => {
      expect(sanitizeFilename('a//b')).toBe('a_b');
      expect(sanitizeFilename('a/\\b')).toBe('a_b');
    });
  });

  describe('dot handling', () => {
    it('removes leading dots', () => {
      expect(sanitizeFilename('.hidden')).toBe('hidden');
      expect(sanitizeFilename('..parent')).toBe('parent');
      expect(sanitizeFilename('...multiple')).toBe('multiple');
    });

    it('removes trailing dots', () => {
      expect(sanitizeFilename('filename.')).toBe('filename');
      expect(sanitizeFilename('filename...')).toBe('filename');
    });

    it('preserves internal dots', () => {
      expect(sanitizeFilename('file.name.txt')).toBe('file.name.txt');
    });
  });

  describe('Windows reserved names', () => {
    it('returns fallback for CON', () => {
      expect(sanitizeFilename('CON')).toBe('export');
      expect(sanitizeFilename('con')).toBe('export');
    });

    it('returns fallback for PRN', () => {
      expect(sanitizeFilename('PRN')).toBe('export');
    });

    it('returns fallback for AUX', () => {
      expect(sanitizeFilename('AUX')).toBe('export');
    });

    it('returns fallback for NUL', () => {
      expect(sanitizeFilename('NUL')).toBe('export');
    });

    it('returns fallback for COM ports', () => {
      expect(sanitizeFilename('COM1')).toBe('export');
      expect(sanitizeFilename('COM9')).toBe('export');
    });

    it('returns fallback for LPT ports', () => {
      expect(sanitizeFilename('LPT1')).toBe('export');
      expect(sanitizeFilename('LPT9')).toBe('export');
    });

    it('handles reserved names with extensions', () => {
      expect(sanitizeFilename('CON.txt')).toBe('export');
      expect(sanitizeFilename('NUL.csv')).toBe('export');
    });

    it('allows names containing reserved words', () => {
      expect(sanitizeFilename('CONNIE')).toBe('CONNIE');
      expect(sanitizeFilename('NULLA')).toBe('NULLA');
    });
  });

  describe('length limiting', () => {
    it('truncates very long names', () => {
      const longName = 'a'.repeat(300);
      const result = sanitizeFilename(longName);
      expect(result.length).toBe(200);
    });

    it('preserves names under limit', () => {
      const name = 'normal_filename';
      expect(sanitizeFilename(name)).toBe(name);
    });
  });

  describe('real-world account IDs', () => {
    it('handles IBAN-style account', () => {
      expect(sanitizeFilename('RO49BTRL1234567890123456')).toBe('RO49BTRL1234567890123456');
    });

    it('handles account with slashes (BIC/account)', () => {
      expect(sanitizeFilename('BTRLRO22/RO49BTRL1234')).toBe('BTRLRO22_RO49BTRL1234');
    });

    it('handles account with special chars', () => {
      expect(sanitizeFilename('ACC<>:12345')).toBe('ACC_12345');
    });
  });

  describe('whitespace handling', () => {
    it('trims leading/trailing whitespace', () => {
      expect(sanitizeFilename('  filename  ')).toBe('filename');
    });

    it('preserves internal spaces', () => {
      expect(sanitizeFilename('file name')).toBe('file name');
    });
  });
});
