/**
 * Unit tests for MT940 Tag Definitions
 */

import { describe, it, expect } from 'vitest';
import {
  MT940_TAGS,
  BRD_SUBFIELDS,
  TRANSACTION_TYPES,
  DC_INDICATORS,
  getTagDefinition,
  getSubfieldDefinition,
  getTransactionTypeName,
  getDCIndicatorName,
} from './mt940Tags';

describe('MT940_TAGS', () => {
  it('contains all required statement tags', () => {
    const requiredTags = [':20:', ':25:', ':28C:', ':60F:', ':61:', ':62F:', ':64:', ':65:', ':86:'];
    for (const tag of requiredTags) {
      expect(MT940_TAGS[tag]).toBeDefined();
      expect(MT940_TAGS[tag].name.en).toBeTruthy();
      expect(MT940_TAGS[tag].name.ro).toBeTruthy();
      expect(MT940_TAGS[tag].description.en).toBeTruthy();
      expect(MT940_TAGS[tag].description.ro).toBeTruthy();
    }
  });

  it('includes intermediate balance tags', () => {
    expect(MT940_TAGS[':60M:']).toBeDefined();
    expect(MT940_TAGS[':62M:']).toBeDefined();
  });

  it('includes legacy statement number tag', () => {
    expect(MT940_TAGS[':28:']).toBeDefined();
  });
});

describe('BRD_SUBFIELDS', () => {
  it('contains all required subfields', () => {
    const requiredCodes = ['+20', '+21', '+22', '+23', '+24', '+25', '+30', '+31', '+32', '+33'];
    for (const code of requiredCodes) {
      expect(BRD_SUBFIELDS[code]).toBeDefined();
      expect(BRD_SUBFIELDS[code].name.en).toBeTruthy();
      expect(BRD_SUBFIELDS[code].name.ro).toBeTruthy();
    }
  });
});

describe('TRANSACTION_TYPES', () => {
  it('contains common transaction types', () => {
    const commonTypes = ['TRF', 'MSC', 'CHK', 'INT', 'DIV', 'DDT', 'STO', 'SAL'];
    for (const type of commonTypes) {
      expect(TRANSACTION_TYPES[type]).toBeDefined();
      expect(TRANSACTION_TYPES[type].en).toBeTruthy();
      expect(TRANSACTION_TYPES[type].ro).toBeTruthy();
    }
  });
});

describe('DC_INDICATORS', () => {
  it('contains all D/C indicators', () => {
    expect(DC_INDICATORS['C']).toEqual({ en: 'Credit', ro: 'Credit' });
    expect(DC_INDICATORS['D']).toEqual({ en: 'Debit', ro: 'Debit' });
    expect(DC_INDICATORS['RC']).toEqual({ en: 'Reversal Credit', ro: 'Stornare Credit' });
    expect(DC_INDICATORS['RD']).toEqual({ en: 'Reversal Debit', ro: 'Stornare Debit' });
  });
});

describe('getTagDefinition', () => {
  it('returns EN definition for known tag', () => {
    const result = getTagDefinition(':61:', 'en');
    expect(result).toBeDefined();
    expect(result?.name).toBe('Statement Line');
    expect(result?.description).toContain('Transaction');
  });

  it('returns RO definition for known tag', () => {
    const result = getTagDefinition(':61:', 'ro');
    expect(result).toBeDefined();
    expect(result?.name).toBe('Linie Extras');
  });

  it('returns undefined for unknown tag', () => {
    const result = getTagDefinition(':99:', 'en');
    expect(result).toBeUndefined();
  });
});

describe('getSubfieldDefinition', () => {
  it('returns EN definition for known subfield', () => {
    const result = getSubfieldDefinition('+32', 'en');
    expect(result).toBeDefined();
    expect(result?.name).toBe('Beneficiary Name');
  });

  it('returns RO definition for known subfield', () => {
    const result = getSubfieldDefinition('+32', 'ro');
    expect(result).toBeDefined();
    expect(result?.name).toBe('Nume Beneficiar');
  });

  it('returns undefined for unknown subfield', () => {
    const result = getSubfieldDefinition('+99', 'en');
    expect(result).toBeUndefined();
  });
});

describe('getTransactionTypeName', () => {
  it('returns EN name for full transaction type code', () => {
    const result = getTransactionTypeName('NTRF', 'en');
    expect(result).toBe('Non-SWIFT Transfer');
  });

  it('returns RO name for full transaction type code', () => {
    const result = getTransactionTypeName('NTRF', 'ro');
    expect(result).toBe('Non-SWIFT Transfer');
  });

  it('handles SWIFT prefix', () => {
    const result = getTransactionTypeName('STRF', 'en');
    expect(result).toBe('SWIFT Transfer');
  });

  it('handles First Advice prefix', () => {
    const result = getTransactionTypeName('FTRF', 'en');
    expect(result).toBe('First Advice Transfer');
  });

  it('returns code as-is for unknown type', () => {
    const result = getTransactionTypeName('NXXX', 'en');
    expect(result).toBe('NXXX');
  });

  it('handles short code without prefix', () => {
    const result = getTransactionTypeName('TRF', 'en');
    expect(result).toBe('Transfer');
  });

  it('returns empty string for empty input', () => {
    const result = getTransactionTypeName('', 'en');
    expect(result).toBe('');
  });

  it('returns name for miscellaneous type', () => {
    const result = getTransactionTypeName('NMSC', 'en');
    expect(result).toBe('Non-SWIFT Miscellaneous');
  });

  it('returns type name without prefix for unknown prefix', () => {
    const result = getTransactionTypeName('ZTRF', 'en');
    expect(result).toBe('Transfer');
  });

  it('returns RO type name without prefix for unknown prefix', () => {
    const result = getTransactionTypeName('XTRF', 'ro');
    expect(result).toBe('Transfer');
  });
});

describe('getDCIndicatorName', () => {
  it('returns EN name for credit', () => {
    expect(getDCIndicatorName('C', 'en')).toBe('Credit');
  });

  it('returns RO name for debit', () => {
    expect(getDCIndicatorName('D', 'ro')).toBe('Debit');
  });

  it('handles lowercase input', () => {
    expect(getDCIndicatorName('c', 'en')).toBe('Credit');
    expect(getDCIndicatorName('rd', 'en')).toBe('Reversal Debit');
  });

  it('returns input for unknown indicator', () => {
    expect(getDCIndicatorName('X', 'en')).toBe('X');
  });
});
