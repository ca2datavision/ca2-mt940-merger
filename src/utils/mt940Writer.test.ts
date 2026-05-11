/**
 * MT940 Writer Round-Trip Test
 * Tests that generated MT940 output can be parsed by mt940-js.
 */

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

async function runRoundTripTest(): Promise<void> {
  console.log('=== MT940 Writer Round-Trip Test ===\n');

  console.log('1. Generating MT940 output...');
  const output = writeMT940([sampleStatement]);
  console.log('\nGenerated MT940:\n---');
  console.log(output);
  console.log('---\n');

  console.log('2. Parsing with mt940-js...');
  try {
    const buffer = new TextEncoder().encode(output);
    const parsed = await mt940.read(buffer.buffer);

    console.log('\nParsed result:');
    console.log(JSON.stringify(parsed, null, 2));

    if (parsed && parsed.length > 0) {
      console.log('\n✅ Round-trip SUCCESS: mt940-js successfully parsed the output');

      const stmt = parsed[0];
      console.log('\nValidation:');
      console.log(`  Account ID: ${stmt.accountId === sampleStatement.accountId ? '✅' : '❌'} ${stmt.accountId}`);
      console.log(`  Transactions: ${stmt.transactions?.length || 0} found`);
    } else {
      console.log('\n❌ Round-trip FAILED: No statements parsed');
    }
  } catch (error) {
    console.log('\n❌ Round-trip FAILED: Parse error');
    console.error(error);
  }
}

export { runRoundTripTest, sampleStatement };
