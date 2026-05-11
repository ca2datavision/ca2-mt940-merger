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
