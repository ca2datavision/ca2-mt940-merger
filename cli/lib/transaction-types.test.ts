import { describe, it, expect } from 'vitest';
import { decodeTransactionType, formatTransactionType, TRANSACTION_TYPES } from './transaction-types.js';

describe('Transaction Type Decoder', () => {
  describe('decodeTransactionType', () => {
    it('decodes NTRF as Non-SWIFT Transfer', () => {
      const result = decodeTransactionType('NTRF');
      expect(result.prefix).toBe('N');
      expect(result.prefixMeaning).toBe('Non-SWIFT');
      expect(result.code).toBe('TRF');
      expect(result.name).toBe('Transfer');
      expect(result.isKnown).toBe(true);
    });

    it('decodes STRF as SWIFT Transfer', () => {
      const result = decodeTransactionType('STRF');
      expect(result.prefix).toBe('S');
      expect(result.prefixMeaning).toBe('SWIFT');
      expect(result.code).toBe('TRF');
      expect(result.name).toBe('Transfer');
      expect(result.isKnown).toBe(true);
    });

    it('decodes NMSC as Non-SWIFT Miscellaneous', () => {
      const result = decodeTransactionType('NMSC');
      expect(result.prefix).toBe('N');
      expect(result.code).toBe('MSC');
      expect(result.name).toBe('Miscellaneous');
      expect(result.isKnown).toBe(true);
    });

    it('decodes NCHK as Non-SWIFT Cheque', () => {
      const result = decodeTransactionType('NCHK');
      expect(result.code).toBe('CHK');
      expect(result.name).toBe('Cheque');
      expect(result.isKnown).toBe(true);
    });

    it('decodes NDIV as Non-SWIFT Dividend', () => {
      const result = decodeTransactionType('NDIV');
      expect(result.code).toBe('DIV');
      expect(result.name).toBe('Dividend');
      expect(result.isKnown).toBe(true);
    });

    it('decodes NINT as Non-SWIFT Interest', () => {
      const result = decodeTransactionType('NINT');
      expect(result.code).toBe('INT');
      expect(result.name).toBe('Interest');
      expect(result.isKnown).toBe(true);
    });

    it('decodes NDDT as Non-SWIFT Direct Debit', () => {
      const result = decodeTransactionType('NDDT');
      expect(result.code).toBe('DDT');
      expect(result.name).toBe('Direct Debit');
      expect(result.isKnown).toBe(true);
    });

    it('handles unknown type codes gracefully', () => {
      const result = decodeTransactionType('NXYZ');
      expect(result.prefix).toBe('N');
      expect(result.prefixMeaning).toBe('Non-SWIFT');
      expect(result.code).toBe('XYZ');
      expect(result.name).toBe('Unknown');
      expect(result.isKnown).toBe(false);
    });

    it('handles unknown prefix gracefully', () => {
      const result = decodeTransactionType('XTRF');
      expect(result.prefix).toBe('X');
      expect(result.prefixMeaning).toBe('Unknown');
      expect(result.code).toBe('TRF');
      expect(result.name).toBe('Transfer');
      expect(result.isKnown).toBe(true);
    });

    it('handles empty input', () => {
      const result = decodeTransactionType('');
      expect(result.isKnown).toBe(false);
      expect(result.description).toContain('Invalid');
    });

    it('handles short input', () => {
      const result = decodeTransactionType('NT');
      expect(result.isKnown).toBe(false);
    });

    it('decodes F prefix as First advice', () => {
      const result = decodeTransactionType('FTRF');
      expect(result.prefix).toBe('F');
      expect(result.prefixMeaning).toBe('First advice');
    });
  });

  describe('formatTransactionType', () => {
    it('formats known type with prefix', () => {
      const decoded = decodeTransactionType('NTRF');
      const formatted = formatTransactionType(decoded);
      expect(formatted).toBe('Non-SWIFT Transfer');
    });

    it('formats unknown type', () => {
      const decoded = decodeTransactionType('NXYZ');
      const formatted = formatTransactionType(decoded);
      expect(formatted).toBe('Non-SWIFT Unknown');
    });
  });

  describe('TRANSACTION_TYPES dictionary', () => {
    it('contains common banking codes', () => {
      expect(TRANSACTION_TYPES['TRF']).toBeDefined();
      expect(TRANSACTION_TYPES['MSC']).toBeDefined();
      expect(TRANSACTION_TYPES['CHK']).toBeDefined();
      expect(TRANSACTION_TYPES['INT']).toBeDefined();
      expect(TRANSACTION_TYPES['DIV']).toBeDefined();
      expect(TRANSACTION_TYPES['DDT']).toBeDefined();
      expect(TRANSACTION_TYPES['STO']).toBeDefined();
      expect(TRANSACTION_TYPES['SAL']).toBeDefined();
    });

    it('has description for each type', () => {
      for (const [code, info] of Object.entries(TRANSACTION_TYPES)) {
        expect(info.code).toBe(code);
        expect(info.name).toBeTruthy();
        expect(info.description).toBeTruthy();
      }
    });
  });
});
