import { describe, it, expect } from 'vitest';
import * as mt940 from 'mt940-js';
import { writeMT940, MT940Statement } from './mt940Writer';

const sampleStatement: MT940Statement = {
  accountId: 'RO49AAAA1B31007593840000',
  statementNumber: '1',
  sequenceNumber: '1',
  openingBalance: {
    date: '2026-05-01',
    amount: '1000.00',
    currency: 'EUR',
    isCredit: true
  },
  closingBalance: {
    date: '2026-05-10',
    amount: '1500.00',
    currency: 'EUR',
    isCredit: true
  },
  transactions: [
    {
      entryDate: '2026-05-05',
      valueDate: '2026-05-05',
      amount: '500.00',
      currency: 'EUR',
      transactionType: 'NTRF',
      description: 'Payment received',
      reference: 'REF001',
      extraDetails: {
        name: 'John Doe',
        account: 'RO50BBBB2C42008604950001'
      }
    }
  ]
};

describe('MT940 Writer', () => {
  it('generates valid MT940 output', () => {
    const output = writeMT940([sampleStatement]);
    expect(output).toContain(':20:');
    expect(output).toContain(':25:RO49AAAA1B31007593840000');
    expect(output).toContain(':60F:');
    expect(output).toContain(':62F:');
  });

  it('round-trips through mt940-js parser', async () => {
    const output = writeMT940([sampleStatement]);
    const buffer = new TextEncoder().encode(output);
    const parsed = await mt940.read(buffer.buffer);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].accountId).toBe(sampleStatement.accountId);
    expect(parsed[0].transactions).toHaveLength(1);
  });
});

describe('MT940 Writer :86: Narrative', () => {
  const baseStatement: MT940Statement = {
    accountId: 'TEST123',
    statementNumber: '1',
    sequenceNumber: '1',
    openingBalance: { date: '2024-01-01', amount: '1000.00', currency: 'EUR', isCredit: true },
    closingBalance: { date: '2024-01-31', amount: '1100.00', currency: 'EUR', isCredit: true },
    transactions: [],
  };

  it('outputs short description as single :86: line', () => {
    const stmt: MT940Statement = {
      ...baseStatement,
      transactions: [{
        valueDate: '2024-01-15',
        entryDate: '2024-01-15',
        amount: '100.00',
        isCredit: true,
        transactionType: 'NMSC',
        reference: 'REF001',
        description: 'Short payment description',
      }],
    };

    const output = writeMT940([stmt]);
    const lines = output.split(/\r?\n/);
    const infoLines = lines.filter(l => l.startsWith(':86:'));

    expect(infoLines).toHaveLength(1);
    expect(infoLines[0]).toBe(':86:Short payment description');
  });

  it('handles long description (>390 chars)', () => {
    const longDesc = 'A'.repeat(500);
    const stmt: MT940Statement = {
      ...baseStatement,
      transactions: [{
        valueDate: '2024-01-15',
        entryDate: '2024-01-15',
        amount: '100.00',
        isCredit: true,
        transactionType: 'NMSC',
        reference: 'REF001',
        description: longDesc,
      }],
    };

    const output = writeMT940([stmt]);
    expect(output).toContain(':86:');
    expect(output).toContain('A'.repeat(100));
  });

  it('round-trips short narrative through mt940-js', async () => {
    const description = 'Payment for invoice #12345';
    const stmt: MT940Statement = {
      ...baseStatement,
      transactions: [{
        valueDate: '2024-01-15',
        entryDate: '2024-01-15',
        amount: '100.00',
        isCredit: true,
        transactionType: 'NMSC',
        reference: 'REF001',
        description,
      }],
    };

    const output = writeMT940([stmt]);
    const buffer = new TextEncoder().encode(output);
    const parsed = await mt940.read(buffer.buffer);

    expect(parsed[0].transactions[0].description).toContain('Payment for invoice');
  });

  it('round-trips long narrative through mt940-js', async () => {
    const description = 'Payment for services rendered including: ' + 'consulting, development, testing, '.repeat(15);
    const stmt: MT940Statement = {
      ...baseStatement,
      transactions: [{
        valueDate: '2024-01-15',
        entryDate: '2024-01-15',
        amount: '100.00',
        isCredit: true,
        transactionType: 'NMSC',
        reference: 'REF001',
        description,
      }],
    };

    const output = writeMT940([stmt]);
    const buffer = new TextEncoder().encode(output);
    const parsed = await mt940.read(buffer.buffer);

    expect(parsed[0].transactions[0].description).toBeTruthy();
    expect(parsed[0].transactions[0].description.length).toBeGreaterThan(100);
  });
});
