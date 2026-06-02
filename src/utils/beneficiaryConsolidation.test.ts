/**
 * Unit tests for Beneficiary Consolidation Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeForMatch,
  parseSubfields,
  reconstructSubfields,
  containsKeyword,
  consolidateCSVRow,
  consolidate86Subfields,
  getDescriptionPrefix,
  parseDescriptionWithPrefix,
  reconstructDescriptionWithPrefix,
  consolidate86Description,
  DEFAULT_CONSOLIDATION_OPTIONS,
} from './beneficiaryConsolidation';

describe('normalizeForMatch', () => {
  it('converts to lowercase', () => {
    expect(normalizeForMatch('PLATA ZILIER')).toBe('plata zilier');
  });

  it('removes Romanian diacritics', () => {
    expect(normalizeForMatch('PLATĂ ZILIER')).toBe('plata zilier');
    expect(normalizeForMatch('ăâîșț')).toBe('aaist');
    expect(normalizeForMatch('ĂÂÎȘȚ')).toBe('aaist');
  });

  it('handles mixed diacritics and case', () => {
    expect(normalizeForMatch('Popescu ȘI Ionescu')).toBe('popescu si ionescu');
  });

  it('trims whitespace', () => {
    expect(normalizeForMatch('  PLATA  ')).toBe('plata');
  });

  it('handles empty input', () => {
    expect(normalizeForMatch('')).toBe('');
    expect(normalizeForMatch(null as unknown as string)).toBe('');
    expect(normalizeForMatch(undefined as unknown as string)).toBe('');
  });

  it('preserves numbers and special characters', () => {
    expect(normalizeForMatch('REF-123/456')).toBe('ref-123/456');
  });
});

describe('parseSubfields', () => {
  it('parses single subfield', () => {
    const result = parseSubfields('+23PLATA ZILIER');
    expect(result).toEqual([{ code: '+23', value: 'PLATA ZILIER' }]);
  });

  it('parses multiple subfields', () => {
    const result = parseSubfields('+23PLATA ZILIER+32POPESCU ION');
    expect(result).toEqual([
      { code: '+23', value: 'PLATA ZILIER' },
      { code: '+32', value: 'POPESCU ION' },
    ]);
  });

  it('trims subfield values', () => {
    const result = parseSubfields('+23 VALUE WITH SPACES ');
    expect(result).toEqual([{ code: '+23', value: 'VALUE WITH SPACES' }]);
  });

  it('handles empty input', () => {
    expect(parseSubfields('')).toEqual([]);
    expect(parseSubfields(null as unknown as string)).toEqual([]);
    expect(parseSubfields(undefined as unknown as string)).toEqual([]);
  });

  it('ignores content before first subfield', () => {
    const result = parseSubfields('000+23VALUE');
    expect(result).toEqual([{ code: '+23', value: 'VALUE' }]);
  });

  it('parses all BRD subfield codes', () => {
    const result = parseSubfields('+20REF+21REL+22BENEF+30BIC+31IBAN+32NAME1+33NAME2');
    expect(result).toHaveLength(7);
    expect(result.map(sf => sf.code)).toEqual(['+20', '+21', '+22', '+30', '+31', '+32', '+33']);
  });
});

describe('reconstructSubfields', () => {
  it('reconstructs single subfield', () => {
    const result = reconstructSubfields([{ code: '+23', value: 'VALUE' }]);
    expect(result).toBe('+23VALUE');
  });

  it('reconstructs multiple subfields', () => {
    const result = reconstructSubfields([
      { code: '+23', value: 'INFO' },
      { code: '+32', value: 'NAME' },
    ]);
    expect(result).toBe('+23INFO+32NAME');
  });

  it('handles empty array', () => {
    expect(reconstructSubfields([])).toBe('');
  });

  it('preserves subfield order', () => {
    const result = reconstructSubfields([
      { code: '+32', value: 'FIRST' },
      { code: '+23', value: 'SECOND' },
    ]);
    expect(result).toBe('+32FIRST+23SECOND');
  });
});

describe('containsKeyword', () => {
  it('matches exact keyword', () => {
    expect(containsKeyword('PLATA ZILIER', 'PLATA ZILIER')).toBe(true);
  });

  it('matches case-insensitive', () => {
    expect(containsKeyword('plata zilier', 'PLATA ZILIER')).toBe(true);
    expect(containsKeyword('PLATA ZILIER', 'plata zilier')).toBe(true);
  });

  it('matches with diacritics difference', () => {
    expect(containsKeyword('PLATĂ ZILIER', 'PLATA ZILIER')).toBe(true);
    expect(containsKeyword('PLATA ZILIER', 'PLATĂ ZILIER')).toBe(true);
  });

  it('matches partial content', () => {
    expect(containsKeyword('TRANSFER PLATA ZILIER LUNA MAI', 'PLATA ZILIER')).toBe(true);
  });

  it('returns false for no match', () => {
    expect(containsKeyword('SALARIU', 'PLATA ZILIER')).toBe(false);
  });

  it('returns false for empty inputs', () => {
    expect(containsKeyword('', 'PLATA ZILIER')).toBe(false);
    expect(containsKeyword('PLATA ZILIER', '')).toBe(false);
    expect(containsKeyword('', '')).toBe(false);
  });

  it('returns false for whitespace-only keyword', () => {
    expect(containsKeyword('PLATA ZILIER', '   ')).toBe(false);
  });
});

describe('consolidateCSVRow', () => {
  const options = { enabled: true, keyword: 'PLATA ZILIER' };

  it('consolidates when details contain keyword', () => {
    const result = consolidateCSVRow(
      'POPESCU ION',
      'PLATA ZILIER LUNA MAI',
      options
    );
    expect(result.beneficiary).toBe('PLATA ZILIER');
    expect(result.details).toBe('PLATA ZILIER LUNA MAI, POPESCU ION');
  });

  it('handles diacritics in details', () => {
    const result = consolidateCSVRow(
      'POPESCU ION',
      'PLATĂ ZILIER LUNA MAI',
      options
    );
    expect(result.beneficiary).toBe('PLATA ZILIER');
    expect(result.details).toBe('PLATĂ ZILIER LUNA MAI, POPESCU ION');
  });

  it('returns unchanged when keyword not found', () => {
    const result = consolidateCSVRow(
      'POPESCU ION',
      'SALARIU LUNA MAI',
      options
    );
    expect(result.beneficiary).toBe('POPESCU ION');
    expect(result.details).toBe('SALARIU LUNA MAI');
  });

  it('returns unchanged when disabled', () => {
    const result = consolidateCSVRow(
      'POPESCU ION',
      'PLATA ZILIER',
      { enabled: false, keyword: 'PLATA ZILIER' }
    );
    expect(result.beneficiary).toBe('POPESCU ION');
    expect(result.details).toBe('PLATA ZILIER');
  });

  it('returns unchanged when keyword is empty', () => {
    const result = consolidateCSVRow(
      'POPESCU ION',
      'PLATA ZILIER',
      { enabled: true, keyword: '' }
    );
    expect(result.beneficiary).toBe('POPESCU ION');
    expect(result.details).toBe('PLATA ZILIER');
  });

  it('returns unchanged when keyword is whitespace', () => {
    const result = consolidateCSVRow(
      'POPESCU ION',
      'PLATA ZILIER',
      { enabled: true, keyword: '   ' }
    );
    expect(result.beneficiary).toBe('POPESCU ION');
    expect(result.details).toBe('PLATA ZILIER');
  });

  it('does not duplicate beneficiary if already equals keyword', () => {
    const result = consolidateCSVRow(
      'PLATA ZILIER',
      'PLATA ZILIER LUNA MAI',
      options
    );
    expect(result.beneficiary).toBe('PLATA ZILIER');
    expect(result.details).toBe('PLATA ZILIER LUNA MAI');
  });

  it('handles empty beneficiary', () => {
    const result = consolidateCSVRow(
      '',
      'PLATA ZILIER',
      options
    );
    expect(result.beneficiary).toBe('PLATA ZILIER');
    expect(result.details).toBe('PLATA ZILIER');
  });

  it('handles empty details with keyword in empty check', () => {
    const result = consolidateCSVRow(
      'POPESCU ION',
      '',
      options
    );
    expect(result.beneficiary).toBe('POPESCU ION');
    expect(result.details).toBe('');
  });
});

describe('consolidate86Subfields', () => {
  const options = { enabled: true, keyword: 'PLATA ZILIER' };

  it('consolidates when NTRF and +23 contains keyword', () => {
    const input = '+23PLATA ZILIER LUNA MAI+32POPESCU ION+33BUCURESTI';
    const result = consolidate86Subfields(input, 'NTRF', options);
    expect(result).toBe('+23PLATA ZILIER LUNA MAI POPESCU ION BUCURESTI+32PLATA ZILIER');
  });

  it('handles lowercase transaction type', () => {
    const input = '+23PLATA ZILIER+32NAME';
    const result = consolidate86Subfields(input, 'ntrf', options);
    expect(result).toBe('+23PLATA ZILIER NAME+32PLATA ZILIER');
  });

  it('returns unchanged for non-NTRF transaction', () => {
    const input = '+23PLATA ZILIER+32NAME';
    const result = consolidate86Subfields(input, 'NMSC', options);
    expect(result).toBe(input);
  });

  it('returns unchanged when keyword not in +23', () => {
    const input = '+23SALARIU+32POPESCU ION';
    const result = consolidate86Subfields(input, 'NTRF', options);
    expect(result).toBe(input);
  });

  it('returns unchanged when no +32 or +33', () => {
    const input = '+23PLATA ZILIER+30BIC CODE';
    const result = consolidate86Subfields(input, 'NTRF', options);
    expect(result).toBe(input);
  });

  it('returns unchanged when disabled', () => {
    const input = '+23PLATA ZILIER+32NAME';
    const result = consolidate86Subfields(input, 'NTRF', { enabled: false, keyword: 'PLATA ZILIER' });
    expect(result).toBe(input);
  });

  it('handles only +32 without +33', () => {
    const input = '+23PLATA ZILIER+32POPESCU ION';
    const result = consolidate86Subfields(input, 'NTRF', options);
    expect(result).toBe('+23PLATA ZILIER POPESCU ION+32PLATA ZILIER');
  });

  it('handles only +33 without +32', () => {
    const input = '+23PLATA ZILIER+33ADDRESS';
    const result = consolidate86Subfields(input, 'NTRF', options);
    expect(result).toBe('+23PLATA ZILIER ADDRESS');
  });

  it('preserves other subfields', () => {
    const input = '+20REF+23PLATA ZILIER+30BIC+32NAME+33ADDR';
    const result = consolidate86Subfields(input, 'NTRF', options);
    expect(result).toContain('+20REF');
    expect(result).toContain('+30BIC');
    expect(result).toContain('+32PLATA ZILIER');
    expect(result).not.toContain('+33');
  });

  it('handles empty description', () => {
    expect(consolidate86Subfields('', 'NTRF', options)).toBe('');
    expect(consolidate86Subfields(null as unknown as string, 'NTRF', options)).toBe(null);
  });

  it('handles empty transaction type', () => {
    const input = '+23PLATA ZILIER+32NAME';
    const result = consolidate86Subfields(input, '', options);
    expect(result).toBe(input);
  });

  it('handles diacritics in keyword match', () => {
    const input = '+23PLATĂ ZILIER+32NAME';
    const result = consolidate86Subfields(input, 'NTRF', options);
    expect(result).toBe('+23PLATĂ ZILIER NAME+32PLATA ZILIER');
  });
});

describe('getDescriptionPrefix', () => {
  it('extracts prefix before first +', () => {
    expect(getDescriptionPrefix('000+23VALUE')).toBe('000');
  });

  it('returns empty for content starting with +', () => {
    expect(getDescriptionPrefix('+23VALUE')).toBe('');
  });

  it('returns full content if no +', () => {
    expect(getDescriptionPrefix('UNSTRUCTURED TEXT')).toBe('UNSTRUCTURED TEXT');
  });

  it('handles empty input', () => {
    expect(getDescriptionPrefix('')).toBe('');
  });
});

describe('parseDescriptionWithPrefix', () => {
  it('parses with prefix', () => {
    const result = parseDescriptionWithPrefix('000+23VALUE+32NAME');
    expect(result.prefix).toBe('000');
    expect(result.subfields).toEqual([
      { code: '+23', value: 'VALUE' },
      { code: '+32', value: 'NAME' },
    ]);
  });

  it('parses without prefix', () => {
    const result = parseDescriptionWithPrefix('+23VALUE');
    expect(result.prefix).toBe('');
    expect(result.subfields).toEqual([{ code: '+23', value: 'VALUE' }]);
  });
});

describe('reconstructDescriptionWithPrefix', () => {
  it('reconstructs with prefix', () => {
    const result = reconstructDescriptionWithPrefix('000', [
      { code: '+23', value: 'VALUE' },
    ]);
    expect(result).toBe('000+23VALUE');
  });

  it('reconstructs without prefix', () => {
    const result = reconstructDescriptionWithPrefix('', [
      { code: '+23', value: 'VALUE' },
    ]);
    expect(result).toBe('+23VALUE');
  });
});

describe('consolidate86Description', () => {
  const options = { enabled: true, keyword: 'PLATA ZILIER' };

  it('consolidates with prefix preservation', () => {
    const input = '000+23PLATA ZILIER+32NAME';
    const result = consolidate86Description(input, 'NTRF', options);
    expect(result).toBe('000+23PLATA ZILIER NAME+32PLATA ZILIER');
  });

  it('returns unchanged for non-NTRF', () => {
    const input = '000+23PLATA ZILIER+32NAME';
    const result = consolidate86Description(input, 'NCHK', options);
    expect(result).toBe(input);
  });
});

describe('DEFAULT_CONSOLIDATION_OPTIONS', () => {
  it('has correct defaults', () => {
    expect(DEFAULT_CONSOLIDATION_OPTIONS.enabled).toBe(true);
    expect(DEFAULT_CONSOLIDATION_OPTIONS.keyword).toBe('PLATA ZILIER');
  });
});
