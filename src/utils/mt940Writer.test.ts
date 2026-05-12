import { describe, it, expect } from 'vitest';
import * as mt940 from 'mt940-js';
import { writeMT940, MT940Statement, convertParsedToWritable } from './mt940Writer';

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

  it('preserves :20: transaction reference from source', () => {
    const stmtWithRef: MT940Statement = {
      ...sampleStatement,
      transactionReference: '73814260',
    };
    const output = writeMT940([stmtWithRef]);
    expect(output).toContain(':20:73814260');
    expect(output).not.toContain(':20:STARTUMS');
  });

  it('uses default STARTUMS when no transaction reference provided', () => {
    const output = writeMT940([sampleStatement]);
    expect(output).toContain(':20:STARTUMS');
  });

  it('round-trips through mt940-js parser', async () => {
    const output = writeMT940([sampleStatement]);
    const buffer = new TextEncoder().encode(output);
    const parsed = await mt940.read(buffer.buffer);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].accountId).toBe(sampleStatement.accountId);
    expect(parsed[0].transactions).toHaveLength(1);
  });

  it('preserves :61: supplementary line', () => {
    const stmtWithSupp: MT940Statement = {
      ...sampleStatement,
      transactions: [{
        ...sampleStatement.transactions![0],
        supplementaryDetails: 'PLATA ZILIER',
      }],
    };
    const output = writeMT940([stmtWithSupp]);
    const lines = output.split(/\r?\n/);
    const idx61 = lines.findIndex(l => l.startsWith(':61:'));
    expect(idx61).toBeGreaterThan(-1);
    expect(lines[idx61 + 1]).toBe('PLATA ZILIER');
  });

  it('round-trips :20: reference through full flow', async () => {
    const stmtWithRef: MT940Statement = {
      ...sampleStatement,
      transactionReference: '73814260',
    };
    const output = writeMT940([stmtWithRef]);
    const buffer = new TextEncoder().encode(output);
    const parsed = await mt940.read(buffer.buffer);

    expect(parsed[0].referenceNumber).toBe('73814260');
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

  it('preserves :86: multi-line content with subfields', () => {
    const description = '000+20Pl Inst Paymnt+30300410008+31RO34RNCB0847173501260001+32RADU DIANA GEORGIANA+33/+23PLATA ZILIER BRD Office';
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

    // Verify all subfields are present in output
    expect(output).toContain('+20Pl Inst Paymnt');
    expect(output).toContain('+32RADU DIANA GEORGIANA');
    expect(output).toContain('+33/');
    expect(output).toContain('+23PLATA ZILIER BRD Office');
  });

  it('round-trips :86: content through parse → convert → write', async () => {
    // Create MT940 with :86: content
    const description = '000+20Payment+32BENEFICIARY NAME+23Additional Info';
    const stmt: MT940Statement = {
      ...baseStatement,
      transactionReference: 'REF123',
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

    // Write → Parse → Convert → Write again
    const output1 = writeMT940([stmt]);
    const buffer = new TextEncoder().encode(output1);
    const parsed = await mt940.read(buffer.buffer);
    const converted = convertParsedToWritable({ statements: parsed });
    const output2 = writeMT940(converted);

    // Both outputs should contain the full description
    expect(output1).toContain('+32BENEFICIARY NAME');
    expect(output2).toContain('+32BENEFICIARY NAME');
    expect(output1).toContain('+23Additional Info');
    expect(output2).toContain('+23Additional Info');
  });
});
