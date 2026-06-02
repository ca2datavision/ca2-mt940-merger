/**
 * Regression Test Suite for Export Fidelity
 *
 * Comprehensive tests to prevent data loss bugs in MT940 export.
 * Tests round-trip fidelity: input MT940 → parse → write → compare
 */

import { describe, it, expect } from 'vitest';
import * as mt940 from 'mt940-js';
import { writeMT940, convertParsedToWritable } from '../utils/mt940Writer';
import type { ConsolidationOptions } from '../utils/beneficiaryConsolidation';

async function parseBuffer(content: string) {
  const buffer = new TextEncoder().encode(content);
  return mt940.read(buffer.buffer);
}

describe('Export Fidelity Regression Tests', () => {
  describe('D/C Marker Preservation (fixes D/C flip bug)', () => {
    it('preserves credit transactions through round-trip', async () => {
      const input = `:20:REF123
:25:TESTACCOUNT
:28C:1/1
:60F:C260501EUR1000,00
:61:2605050505C100,00NTRF REF001
:86:Credit transaction
:62F:C260510EUR1100,00
-`;
      const parsed = await parseBuffer(input);
      const writable = convertParsedToWritable({ statements: parsed });
      const output = writeMT940(writable);

      expect(output).toContain('C100,00');
      expect(output).not.toContain('D100,00');
    });

    it('preserves debit transactions through round-trip', async () => {
      const input = `:20:REF123
:25:TESTACCOUNT
:28C:1/1
:60F:C260501EUR1000,00
:61:2605050505D200,00NTRF REF002
:86:Debit transaction
:62F:C260510EUR800,00
-`;
      const parsed = await parseBuffer(input);
      const writable = convertParsedToWritable({ statements: parsed });
      const output = writeMT940(writable);

      expect(output).toContain('D200,00');
      expect(output).not.toContain('C200,00NTRF');
    });

    it('preserves mixed credit/debit transactions', async () => {
      const input = `:20:REF123
:25:TESTACCOUNT
:28C:1/1
:60F:C260501EUR1000,00
:61:2605050505C500,00NTRF CREDIT1
:86:Credit
:61:2605060606D300,00NTRF DEBIT1
:86:Debit
:61:2605070707C200,00NTRF CREDIT2
:86:Credit2
:62F:C260510EUR1400,00
-`;
      const parsed = await parseBuffer(input);
      const writable = convertParsedToWritable({ statements: parsed });
      const output = writeMT940(writable);

      expect(output).toContain('C500,00');
      expect(output).toContain('D300,00');
      expect(output).toMatch(/C200,00.*CREDIT2/s);
    });
  });

  describe(':20: Reference Preservation (fixes STARTUMS replacement bug)', () => {
    it('preserves original :20: reference through round-trip', async () => {
      const input = `:20:73814260
:25:TESTACCOUNT
:28C:1/1
:60F:C260501EUR1000,00
:62F:C260510EUR1000,00
-`;
      const parsed = await parseBuffer(input);
      const writable = convertParsedToWritable({ statements: parsed });
      const output = writeMT940(writable);

      expect(output).toContain(':20:73814260');
      expect(output).not.toContain(':20:STARTUMS');
    });

    it('preserves alphanumeric :20: reference', async () => {
      const input = `:20:ABC-2024-05-001
:25:TESTACCOUNT
:28C:1/1
:60F:C260501EUR1000,00
:62F:C260510EUR1000,00
-`;
      const parsed = await parseBuffer(input);
      const writable = convertParsedToWritable({ statements: parsed });
      const output = writeMT940(writable);

      expect(output).toContain(':20:ABC-2024-05-001');
    });
  });

  describe(':64:/:65: Available Balance Emission', () => {
    it('preserves :64: closing available balance through round-trip', async () => {
      const input = `:20:REF123
:25:TESTACCOUNT
:28C:1/1
:60F:C260501EUR1000,00
:62F:C260510EUR1000,00
:64:C260510EUR950,00
-`;
      const parsed = await parseBuffer(input);
      const writable = convertParsedToWritable({ statements: parsed });
      const output = writeMT940(writable);

      expect(output).toContain(':64:C260510EUR950,00');
    });

    it('emits :65: forward available balance when present', () => {
      const output = writeMT940([{
        accountId: 'TEST',
        statementNumber: '1',
        sequenceNumber: '1',
        openingBalance: { date: '2024-01-01', amount: '1000', currency: 'EUR', isCredit: true },
        closingBalance: { date: '2024-01-31', amount: '1000', currency: 'EUR', isCredit: true },
        forwardAvailableBalance: { date: '2024-02-01', amount: '800', currency: 'EUR', isCredit: true },
        transactions: [],
      }]);

      expect(output).toContain(':65:C240201EUR800,00');
    });

    it('preserves both :64: and :65: when present', () => {
      const output = writeMT940([{
        accountId: 'TEST',
        statementNumber: '1',
        sequenceNumber: '1',
        openingBalance: { date: '2024-01-01', amount: '1000', currency: 'EUR', isCredit: true },
        closingBalance: { date: '2024-01-31', amount: '1000', currency: 'EUR', isCredit: true },
        availableBalance: { date: '2024-01-31', amount: '950', currency: 'EUR', isCredit: true },
        forwardAvailableBalance: { date: '2024-02-01', amount: '800', currency: 'EUR', isCredit: true },
        transactions: [],
      }]);

      expect(output).toContain(':64:C240131EUR950,00');
      expect(output).toContain(':65:C240201EUR800,00');
    });
  });

  describe(':86: Narrative Preservation (fixes truncation bug)', () => {
    it('preserves full :86: content through round-trip', async () => {
      const input = `:20:REF123
:25:TESTACCOUNT
:28C:1/1
:60F:C260501EUR1000,00
:61:2605050505C100,00NTRF REF001
:86:000+20Pl Inst Paymnt+30300410008+31RO34RNCB0847173501260001+32RADU DIANA GEORGIANA+33/+23PLATA ZILIER
:62F:C260510EUR1100,00
-`;
      const parsed = await parseBuffer(input);
      const writable = convertParsedToWritable({ statements: parsed });
      const output = writeMT940(writable);

      expect(output).toContain('+20Pl Inst Paymnt');
      expect(output).toContain('+32RADU DIANA GEORGIANA');
      expect(output).toContain('+23PLATA ZILIER');
    });

    it('preserves long :86: narrative (>65 chars)', async () => {
      const longDesc = 'Payment description with many details '.repeat(10);
      const output = writeMT940([{
        accountId: 'TEST',
        statementNumber: '1',
        sequenceNumber: '1',
        openingBalance: { date: '2024-01-01', amount: '1000', currency: 'EUR', isCredit: true },
        closingBalance: { date: '2024-01-31', amount: '1100', currency: 'EUR', isCredit: true },
        transactions: [{
          valueDate: '2024-01-15',
          entryDate: '2024-01-15',
          amount: '100',
          isCredit: true,
          transactionType: 'NTRF',
          reference: 'REF',
          description: longDesc,
        }],
      }]);

      expect(output).toContain(':86:');
      expect(output).toContain('Payment description');
    });
  });

  describe(':61: Supplementary Details Preservation', () => {
    it('outputs supplementary details on line after :61:', () => {
      const output = writeMT940([{
        accountId: 'TEST',
        statementNumber: '1',
        sequenceNumber: '1',
        openingBalance: { date: '2024-01-01', amount: '1000', currency: 'EUR', isCredit: true },
        closingBalance: { date: '2024-01-31', amount: '1100', currency: 'EUR', isCredit: true },
        transactions: [{
          valueDate: '2024-01-15',
          entryDate: '2024-01-15',
          amount: '100',
          isCredit: true,
          transactionType: 'NTRF',
          reference: 'REF',
          description: 'Details',
          supplementaryDetails: 'SUPPLEMENTARY INFO',
        }],
      }]);

      const lines = output.split(/\r?\n/);
      const idx61 = lines.findIndex(l => l.startsWith(':61:'));
      expect(lines[idx61 + 1]).toBe('SUPPLEMENTARY INFO');
    });

    it('does NOT emit false supplementary lines from tx.id hash', async () => {
      const input = `:20:REF123
:25:TESTACCOUNT
:28C:1/1
:60F:C260501EUR1000,00
:61:2605050505C100,00NTRF REF001
:86:Transaction details
:62F:C260510EUR1100,00
-`;
      const parsed = await parseBuffer(input);
      const writable = convertParsedToWritable({ statements: parsed });
      const output = writeMT940(writable);

      const lines = output.split(/\r?\n/);
      const idx61 = lines.findIndex(l => l.startsWith(':61:'));
      expect(idx61).toBeGreaterThan(-1);
      // Next line should be :86: (the description), NOT a hash or random string
      expect(lines[idx61 + 1]).toMatch(/^:86:/);
      // Ensure no MD5-like hash appears anywhere
      expect(output).not.toMatch(/[a-f0-9]{32}/);
    });
  });

  describe('Full Round-Trip Fidelity', () => {
    it('preserves all key fields through complete parse→write cycle', async () => {
      const input = `:20:MYREF2024
:25:RO49AAAA1B31007593840000
:28C:5/1
:60F:C260501EUR10000,00
:61:2605050505C1500,00NTRF PAYMENT1
:86:000+20Payment+32BENEFICIARY NAME+23Extra info
:61:2605060606D500,00NTRF PAYMENT2
:86:Outgoing payment
:62F:C260510EUR11000,00
:64:C260510EUR10500,00
-`;
      const parsed = await parseBuffer(input);
      const writable = convertParsedToWritable({ statements: parsed });
      const output = writeMT940(writable);

      // :20: preserved
      expect(output).toContain(':20:MYREF2024');

      // :25: preserved
      expect(output).toContain(':25:RO49AAAA1B31007593840000');

      // :28C: preserved
      expect(output).toContain(':28C:5/1');

      // :60F: preserved with correct D/C
      expect(output).toContain(':60F:C260501EUR10000,00');

      // :61: credit preserved
      expect(output).toContain('C1500,00');

      // :61: debit preserved
      expect(output).toContain('D500,00');

      // :86: subfields preserved
      expect(output).toContain('+20Payment');
      expect(output).toContain('+32BENEFICIARY NAME');

      // :62F: preserved
      expect(output).toContain(':62F:C260510EUR11000,00');

      // :64: preserved
      expect(output).toContain(':64:C260510EUR10500,00');
    });

    it('handles multiple statements in sequence', async () => {
      const input = `:20:STMT001
:25:ACC1
:28C:1/1
:60F:C260501EUR1000,00
:62F:C260510EUR1500,00
-
:20:STMT002
:25:ACC1
:28C:2/1
:60F:C260510EUR1500,00
:62F:C260520EUR2000,00
-`;
      const parsed = await parseBuffer(input);
      const writable = convertParsedToWritable({ statements: parsed });
      const output = writeMT940(writable);

      expect(output).toContain(':20:STMT001');
      expect(output).toContain(':20:STMT002');
      expect(output).toContain(':28C:1/1');
      expect(output).toContain(':28C:2/1');
    });
  });

  describe('Beneficiary Consolidation for :86: (NTRF transactions)', () => {
    const consolidationOptions: ConsolidationOptions = {
      enabled: true,
      keyword: 'PLATA ZILIER',
    };

    it('transforms :86: subfields when NTRF + keyword match', () => {
      const output = writeMT940([{
        accountId: 'TEST',
        statementNumber: '1',
        sequenceNumber: '1',
        openingBalance: { date: '2024-01-01', amount: '1000', currency: 'EUR', isCredit: true },
        closingBalance: { date: '2024-01-31', amount: '900', currency: 'EUR', isCredit: true },
        transactions: [{
          valueDate: '2024-01-15',
          entryDate: '2024-01-15',
          amount: '100',
          isCredit: false,
          transactionType: 'NTRF',
          reference: 'REF001',
          description: '000+20Pl Inst Paymnt+23PLATA ZILIER BRD+32POPESCU DIANA+33GEORGIANA',
        }],
      }], { consolidationOptions });

      expect(output).toContain('+23PLATA ZILIER BRD POPESCU DIANA GEORGIANA');
      expect(output).toContain('+32PLATA ZILIER');
      expect(output).not.toContain('+33GEORGIANA');
    });

    it('does NOT transform non-NTRF transactions', () => {
      const output = writeMT940([{
        accountId: 'TEST',
        statementNumber: '1',
        sequenceNumber: '1',
        openingBalance: { date: '2024-01-01', amount: '1000', currency: 'EUR', isCredit: true },
        closingBalance: { date: '2024-01-31', amount: '900', currency: 'EUR', isCredit: true },
        transactions: [{
          valueDate: '2024-01-15',
          entryDate: '2024-01-15',
          amount: '100',
          isCredit: false,
          transactionType: 'NMSC',
          reference: 'REF001',
          description: '000+20Payment+23PLATA ZILIER+32POPESCU DIANA+33GEORGIANA',
        }],
      }], { consolidationOptions });

      expect(output).toContain('+32POPESCU DIANA');
      expect(output).toContain('+33GEORGIANA');
    });

    it('does NOT transform NTRF without keyword match', () => {
      const output = writeMT940([{
        accountId: 'TEST',
        statementNumber: '1',
        sequenceNumber: '1',
        openingBalance: { date: '2024-01-01', amount: '1000', currency: 'EUR', isCredit: true },
        closingBalance: { date: '2024-01-31', amount: '900', currency: 'EUR', isCredit: true },
        transactions: [{
          valueDate: '2024-01-15',
          entryDate: '2024-01-15',
          amount: '100',
          isCredit: false,
          transactionType: 'NTRF',
          reference: 'REF001',
          description: '000+20Regular Payment+23Some info+32POPESCU DIANA+33GEORGIANA',
        }],
      }], { consolidationOptions });

      expect(output).toContain('+32POPESCU DIANA');
      expect(output).toContain('+33GEORGIANA');
    });

    it('handles missing +33 subfield gracefully', () => {
      const output = writeMT940([{
        accountId: 'TEST',
        statementNumber: '1',
        sequenceNumber: '1',
        openingBalance: { date: '2024-01-01', amount: '1000', currency: 'EUR', isCredit: true },
        closingBalance: { date: '2024-01-31', amount: '900', currency: 'EUR', isCredit: true },
        transactions: [{
          valueDate: '2024-01-15',
          entryDate: '2024-01-15',
          amount: '100',
          isCredit: false,
          transactionType: 'NTRF',
          reference: 'REF001',
          description: '000+20Pl Inst+23PLATA ZILIER BRD+32POPESCU DIANA',
        }],
      }], { consolidationOptions });

      expect(output).toContain('+23PLATA ZILIER BRD POPESCU DIANA');
      expect(output).toContain('+32PLATA ZILIER');
    });

    it('handles missing +23 subfield - no transformation', () => {
      const output = writeMT940([{
        accountId: 'TEST',
        statementNumber: '1',
        sequenceNumber: '1',
        openingBalance: { date: '2024-01-01', amount: '1000', currency: 'EUR', isCredit: true },
        closingBalance: { date: '2024-01-31', amount: '900', currency: 'EUR', isCredit: true },
        transactions: [{
          valueDate: '2024-01-15',
          entryDate: '2024-01-15',
          amount: '100',
          isCredit: false,
          transactionType: 'NTRF',
          reference: 'REF001',
          description: '000+20Pl Inst+32POPESCU DIANA+33GEORGIANA',
        }],
      }], { consolidationOptions });

      expect(output).toContain('+32POPESCU DIANA');
      expect(output).toContain('+33GEORGIANA');
    });

    it('preserves prefix before +NN subfields', () => {
      const output = writeMT940([{
        accountId: 'TEST',
        statementNumber: '1',
        sequenceNumber: '1',
        openingBalance: { date: '2024-01-01', amount: '1000', currency: 'EUR', isCredit: true },
        closingBalance: { date: '2024-01-31', amount: '900', currency: 'EUR', isCredit: true },
        transactions: [{
          valueDate: '2024-01-15',
          entryDate: '2024-01-15',
          amount: '100',
          isCredit: false,
          transactionType: 'NTRF',
          reference: 'REF001',
          description: '000+20Pl Inst Paymnt+23PLATA ZILIER BRD+32POPESCU',
        }],
      }], { consolidationOptions });

      expect(output).toContain(':86:000');
      expect(output).toContain('+20Pl Inst Paymnt');
    });

    it('does NOT transform when consolidation is disabled', () => {
      const disabledOptions: ConsolidationOptions = {
        enabled: false,
        keyword: 'PLATA ZILIER',
      };

      const output = writeMT940([{
        accountId: 'TEST',
        statementNumber: '1',
        sequenceNumber: '1',
        openingBalance: { date: '2024-01-01', amount: '1000', currency: 'EUR', isCredit: true },
        closingBalance: { date: '2024-01-31', amount: '900', currency: 'EUR', isCredit: true },
        transactions: [{
          valueDate: '2024-01-15',
          entryDate: '2024-01-15',
          amount: '100',
          isCredit: false,
          transactionType: 'NTRF',
          reference: 'REF001',
          description: '000+23PLATA ZILIER BRD+32POPESCU DIANA+33GEORGIANA',
        }],
      }], { consolidationOptions: disabledOptions });

      expect(output).toContain('+32POPESCU DIANA');
      expect(output).toContain('+33GEORGIANA');
    });

    it('backward compatible - no options means no transformation', () => {
      const output = writeMT940([{
        accountId: 'TEST',
        statementNumber: '1',
        sequenceNumber: '1',
        openingBalance: { date: '2024-01-01', amount: '1000', currency: 'EUR', isCredit: true },
        closingBalance: { date: '2024-01-31', amount: '900', currency: 'EUR', isCredit: true },
        transactions: [{
          valueDate: '2024-01-15',
          entryDate: '2024-01-15',
          amount: '100',
          isCredit: false,
          transactionType: 'NTRF',
          reference: 'REF001',
          description: '000+23PLATA ZILIER BRD+32POPESCU DIANA+33GEORGIANA',
        }],
      }]);

      expect(output).toContain('+32POPESCU DIANA');
      expect(output).toContain('+33GEORGIANA');
    });

    it('handles case-insensitive keyword matching', () => {
      const output = writeMT940([{
        accountId: 'TEST',
        statementNumber: '1',
        sequenceNumber: '1',
        openingBalance: { date: '2024-01-01', amount: '1000', currency: 'EUR', isCredit: true },
        closingBalance: { date: '2024-01-31', amount: '900', currency: 'EUR', isCredit: true },
        transactions: [{
          valueDate: '2024-01-15',
          entryDate: '2024-01-15',
          amount: '100',
          isCredit: false,
          transactionType: 'NTRF',
          reference: 'REF001',
          description: '000+23plata zilier lowercase+32POPESCU',
        }],
      }], { consolidationOptions });

      expect(output).toContain('+23plata zilier lowercase POPESCU');
      expect(output).toContain('+32PLATA ZILIER');
    });

    it('handles diacritics-agnostic matching (Romanian)', () => {
      const output = writeMT940([{
        accountId: 'TEST',
        statementNumber: '1',
        sequenceNumber: '1',
        openingBalance: { date: '2024-01-01', amount: '1000', currency: 'EUR', isCredit: true },
        closingBalance: { date: '2024-01-31', amount: '900', currency: 'EUR', isCredit: true },
        transactions: [{
          valueDate: '2024-01-15',
          entryDate: '2024-01-15',
          amount: '100',
          isCredit: false,
          transactionType: 'NTRF',
          reference: 'REF001',
          description: '000+23PLATĂ ZILIER cu diacritice+32POPESCU',
        }],
      }], { consolidationOptions });

      expect(output).toContain('+32PLATA ZILIER');
    });

    it('produces idempotent output on re-export', async () => {
      const input = `:20:REF123
:25:TESTACCOUNT
:28C:1/1
:60F:C260501EUR1000,00
:61:2605050505D100,00NTRF REF001
:86:000+20Pl Inst+23PLATA ZILIER BRD+32POPESCU DIANA+33GEORGIANA
:62F:C260510EUR900,00
-`;
      const parsed = await parseBuffer(input);
      const writable = convertParsedToWritable({ statements: parsed });
      const output1 = writeMT940(writable, { consolidationOptions });

      const parsed2 = await parseBuffer(output1);
      const writable2 = convertParsedToWritable({ statements: parsed2 });
      const output2 = writeMT940(writable2, { consolidationOptions });

      expect(output1).toBe(output2);
    });

    it('transforms when +32=keyword but +33 still present (appends only +33)', () => {
      const output = writeMT940([{
        accountId: 'TEST',
        statementNumber: '1',
        sequenceNumber: '1',
        openingBalance: { date: '2024-01-01', amount: '1000', currency: 'EUR', isCredit: true },
        closingBalance: { date: '2024-01-31', amount: '900', currency: 'EUR', isCredit: true },
        transactions: [{
          valueDate: '2024-01-15',
          entryDate: '2024-01-15',
          amount: '100',
          isCredit: false,
          transactionType: 'NTRF',
          reference: 'REF001',
          description: '000+23PLATA ZILIER BRD+32PLATA ZILIER+33GEORGIANA',
        }],
      }], { consolidationOptions });

      // Only +33 should be folded into +23 (not +32 since it equals keyword)
      expect(output).toContain('+23PLATA ZILIER BRD GEORGIANA');
      expect(output).toContain('+32PLATA ZILIER');
      expect(output).not.toContain('+33GEORGIANA');
    });

    it('skips fully consolidated records (+32=keyword, no +33, beneficiary in +23)', () => {
      const output = writeMT940([{
        accountId: 'TEST',
        statementNumber: '1',
        sequenceNumber: '1',
        openingBalance: { date: '2024-01-01', amount: '1000', currency: 'EUR', isCredit: true },
        closingBalance: { date: '2024-01-31', amount: '900', currency: 'EUR', isCredit: true },
        transactions: [{
          valueDate: '2024-01-15',
          entryDate: '2024-01-15',
          amount: '100',
          isCredit: false,
          transactionType: 'NTRF',
          reference: 'REF001',
          description: '000+23PLATA ZILIER BRD POPESCU ION+32PLATA ZILIER',
        }],
      }], { consolidationOptions });

      expect(output).toContain('+23PLATA ZILIER BRD POPESCU ION');
      expect(output).toContain('+32PLATA ZILIER');
      expect(output).not.toContain('PLATA ZILIER PLATA ZILIER');
    });

    it('handles missing +32 in source (only +33 present)', () => {
      const output = writeMT940([{
        accountId: 'TEST',
        statementNumber: '1',
        sequenceNumber: '1',
        openingBalance: { date: '2024-01-01', amount: '1000', currency: 'EUR', isCredit: true },
        closingBalance: { date: '2024-01-31', amount: '900', currency: 'EUR', isCredit: true },
        transactions: [{
          valueDate: '2024-01-15',
          entryDate: '2024-01-15',
          amount: '100',
          isCredit: false,
          transactionType: 'NTRF',
          reference: 'REF001',
          description: '000+23PLATA ZILIER BRD+33GEORGIANA',
        }],
      }], { consolidationOptions });

      expect(output).toContain('+23PLATA ZILIER BRD GEORGIANA');
      expect(output).not.toContain('+33');
    });

    it('re-export of fully consolidated record is idempotent', async () => {
      const alreadyConsolidated = `:20:REF123
:25:TESTACCOUNT
:28C:1/1
:60F:C260501EUR1000,00
:61:2605050505D100,00NTRF REF001
:86:000+23PLATA ZILIER BRD POPESCU ION+32PLATA ZILIER
:62F:C260510EUR900,00
-`;
      const parsed = await parseBuffer(alreadyConsolidated);
      const writable = convertParsedToWritable({ statements: parsed });
      const output1 = writeMT940(writable, { consolidationOptions });

      const parsed2 = await parseBuffer(output1);
      const writable2 = convertParsedToWritable({ statements: parsed2 });
      const output2 = writeMT940(writable2, { consolidationOptions });

      expect(output1).toBe(output2);
      expect(output1).not.toContain('PLATA ZILIER PLATA ZILIER');
    });

    it('handles partially consolidated source from ZIP archive (appends only +33)', async () => {
      const partiallyConsolidated = `:20:REF456
:25:TESTACCOUNT
:28C:1/1
:60F:C260501EUR1000,00
:61:2605050505D100,00NTRF REF001
:86:000+23PLATA ZILIER BRD+32PLATA ZILIER+33GEORGIANA
:62F:C260510EUR900,00
-`;
      const parsed = await parseBuffer(partiallyConsolidated);
      const writable = convertParsedToWritable({ statements: parsed });
      const output = writeMT940(writable, { consolidationOptions });

      expect(output).toContain('+23PLATA ZILIER BRD GEORGIANA');
      expect(output).toContain('+32PLATA ZILIER');
      expect(output).not.toContain('+33GEORGIANA');
    });
  });
});
