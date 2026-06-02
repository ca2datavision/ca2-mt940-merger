/**
 * Component Tests for PreviewModal/SubfieldBreakdown
 *
 * Tests verify the rendering logic and data transformations used by
 * SubfieldBreakdown component without requiring a DOM environment.
 */

import { describe, it, expect, vi } from 'vitest';
import { parseSubfields, getDescriptionPrefix, parseDescriptionWithPrefix } from '../utils/beneficiaryConsolidation';
import { getSubfieldDefinition, BRD_SUBFIELDS } from '../utils/mt940Tags';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('../stores/FileStore', () => ({
  fileStore: {
    files: [],
    selectedFile: null,
    setSelectedFile: vi.fn(),
  },
}));

describe('PreviewModal', () => {
  it('module imports without errors', async () => {
    const module = await import('./PreviewModal');
    expect(module.PreviewModal).toBeDefined();
  });
});

describe('SubfieldBreakdown rendering logic', () => {
  describe('prefix preservation', () => {
    it('extracts prefix content before first +NN subfield', () => {
      const description = '000+20REF+23DETAIL';
      const { prefix, subfields } = parseDescriptionWithPrefix(description);

      expect(prefix).toBe('000');
      expect(subfields).toHaveLength(2);
      expect(subfields[0]).toEqual({ code: '+20', value: 'REF' });
      expect(subfields[1]).toEqual({ code: '+23', value: 'DETAIL' });
    });

    it('handles 3-digit BRD transaction code prefix', () => {
      const description = '835+20PAYMENT123+32POPESCU ION';
      const { prefix, subfields } = parseDescriptionWithPrefix(description);

      expect(prefix).toBe('835');
      expect(subfields[0].code).toBe('+20');
      expect(subfields[1].code).toBe('+32');
    });

    it('preserves multi-character prefix', () => {
      const description = 'ABC123+23INFO';
      const { prefix } = parseDescriptionWithPrefix(description);

      expect(prefix).toBe('ABC123');
    });
  });

  describe('no-prefix descriptions', () => {
    it('handles description starting with +NN', () => {
      const description = '+20REF+23DETAIL';
      const { prefix, subfields } = parseDescriptionWithPrefix(description);

      expect(prefix).toBe('');
      expect(subfields).toHaveLength(2);
    });

    it('returns empty prefix for subfield-only content', () => {
      const description = '+32POPESCU ION+33BUCURESTI';
      const prefix = getDescriptionPrefix(description);

      expect(prefix).toBe('');
    });
  });

  describe('plain text fallback', () => {
    it('returns plain text when no +NN subfields present', () => {
      const description = 'SOME PLAIN TEXT WITHOUT SUBFIELDS';
      const subfields = parseSubfields(description);

      expect(subfields).toHaveLength(0);
    });

    it('identifies full content as prefix when no subfields', () => {
      const description = 'UNSTRUCTURED NARRATIVE TEXT';
      const prefix = getDescriptionPrefix(description);

      expect(prefix).toBe('UNSTRUCTURED NARRATIVE TEXT');
    });

    it('handles empty description', () => {
      const subfields = parseSubfields('');
      expect(subfields).toHaveLength(0);
    });
  });

  describe('locale switching', () => {
    it('returns EN label for +32 subfield', () => {
      const def = getSubfieldDefinition('+32', 'en');

      expect(def).toBeDefined();
      expect(def?.name).toBe('Beneficiary Name');
      expect(def?.description).toBe('Counterparty name (line 1)');
    });

    it('returns RO label for +32 subfield', () => {
      const def = getSubfieldDefinition('+32', 'ro');

      expect(def).toBeDefined();
      expect(def?.name).toBe('Nume Beneficiar');
      expect(def?.description).toBe('Numele contrapartidei (linia 1)');
    });

    it('returns EN label for +23 subfield', () => {
      const def = getSubfieldDefinition('+23', 'en');

      expect(def?.name).toBe('Payment Details');
    });

    it('returns RO label for +23 subfield', () => {
      const def = getSubfieldDefinition('+23', 'ro');

      expect(def?.name).toBe('Detalii Plată');
    });

    it('returns undefined for unknown subfield code', () => {
      const def = getSubfieldDefinition('+99', 'en');

      expect(def).toBeUndefined();
    });
  });

  describe('BRD subfield coverage', () => {
    it('has definitions for all standard BRD subfield codes', () => {
      const expectedCodes = ['+20', '+21', '+22', '+23', '+24', '+25', '+30', '+31', '+32', '+33'];

      for (const code of expectedCodes) {
        expect(BRD_SUBFIELDS[code]).toBeDefined();
        expect(BRD_SUBFIELDS[code].name.en).toBeTruthy();
        expect(BRD_SUBFIELDS[code].name.ro).toBeTruthy();
      }
    });
  });

  describe('complex description parsing', () => {
    it('parses real BRD :86: content with prefix', () => {
      const description = '835+20TRF123456+23PLATA FACTURA+30BTRLRO22+31RO49BTRL1234567890+32FURNIZOR SRL';
      const { prefix, subfields } = parseDescriptionWithPrefix(description);

      expect(prefix).toBe('835');
      expect(subfields).toHaveLength(5);
      expect(subfields.find(sf => sf.code === '+20')?.value).toBe('TRF123456');
      expect(subfields.find(sf => sf.code === '+23')?.value).toBe('PLATA FACTURA');
      expect(subfields.find(sf => sf.code === '+32')?.value).toBe('FURNIZOR SRL');
    });

    it('handles subfields with special characters', () => {
      const description = '+23PLATA REF-2024/001+32COMPANY S.R.L.';
      const subfields = parseSubfields(description);

      expect(subfields[0].value).toBe('PLATA REF-2024/001');
      expect(subfields[1].value).toBe('COMPANY S.R.L.');
    });
  });
});
