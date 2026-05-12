import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { mergeSingleStatement, previewSingleStatementMerge, validateMergeResult } from './singleStatement';
import type { Statement, Transaction } from '../types/validation';

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'txn-1',
    fingerprint: 'fp-1',
    entryDate: '2024-01-15',
    valueDate: '2024-01-15',
    amount: new Decimal('100.00'),
    currency: 'EUR',
    isCredit: true,
    transactionType: 'NTRF',
    customerReference: 'REF001',
    bankReference: '',
    description: 'Test transaction',
    ...overrides,
  };
}

function makeStatement(overrides: Partial<Statement> = {}): Statement {
  return {
    id: 'stmt-1',
    fileId: 'file-1',
    accountId: 'ACCOUNT123',
    statementNumber: '001',
    sequenceNumber: '1',
    openingBalance: {
      date: '2024-01-01',
      amount: new Decimal('1000.00'),
      currency: 'EUR',
      isCredit: true,
    },
    closingBalance: {
      date: '2024-01-31',
      amount: new Decimal('1100.00'),
      currency: 'EUR',
      isCredit: true,
    },
    transactions: [makeTransaction()],
    ...overrides,
  };
}

describe('mergeSingleStatement', () => {
  it('returns single statement unchanged', () => {
    const stmt = makeStatement();
    const merged = mergeSingleStatement([stmt]);

    expect(merged.accountId).toBe(stmt.accountId);
    expect(merged.transactions).toHaveLength(1);
    expect(merged.sourceStatementIds).toEqual([stmt.id]);
  });

  it('merges two statements chronologically', () => {
    const stmt1 = makeStatement({
      id: 'stmt-1',
      statementNumber: '001',
      openingBalance: { date: '2024-01-01', amount: new Decimal('1000'), currency: 'EUR', isCredit: true },
      closingBalance: { date: '2024-01-31', amount: new Decimal('1100'), currency: 'EUR', isCredit: true },
      transactions: [makeTransaction({ id: 'txn-1', entryDate: '2024-01-15', amount: new Decimal('100'), isCredit: true })],
    });
    const stmt2 = makeStatement({
      id: 'stmt-2',
      statementNumber: '002',
      openingBalance: { date: '2024-02-01', amount: new Decimal('1100'), currency: 'EUR', isCredit: true },
      closingBalance: { date: '2024-02-28', amount: new Decimal('1300'), currency: 'EUR', isCredit: true },
      transactions: [makeTransaction({ id: 'txn-2', entryDate: '2024-02-15', amount: new Decimal('200'), isCredit: true })],
    });

    const merged = mergeSingleStatement([stmt1, stmt2]);

    expect(merged.statementNumber).toBe('001-002');
    expect(merged.transactions).toHaveLength(2);
    expect(merged.openingBalance.amount.equals(new Decimal('1000'))).toBe(true);
    expect(merged.closingBalance.amount.equals(new Decimal('1300'))).toBe(true);
    expect(merged.sourceStatementIds).toEqual(['stmt-1', 'stmt-2']);
  });

  it('recalculates closing balance from transactions', () => {
    const stmt1 = makeStatement({
      id: 'stmt-1',
      openingBalance: { date: '2024-01-01', amount: new Decimal('1000'), currency: 'EUR', isCredit: true },
      transactions: [
        makeTransaction({ id: 'txn-1', entryDate: '2024-01-10', amount: new Decimal('500'), isCredit: true }),
        makeTransaction({ id: 'txn-2', entryDate: '2024-01-20', amount: new Decimal('200'), isCredit: false }),
      ],
    });

    const merged = mergeSingleStatement([stmt1]);

    expect(merged.closingBalance.amount.equals(new Decimal('1300'))).toBe(true);
  });

  it('recalculates closing balance: opening + credits - debits', () => {
    const stmt = makeStatement({
      id: 'stmt-1',
      openingBalance: { date: '2024-01-01', amount: new Decimal('5000'), currency: 'EUR', isCredit: true },
      closingBalance: { date: '2024-01-31', amount: new Decimal('9999'), currency: 'EUR', isCredit: true },
      transactions: [
        makeTransaction({ id: 'txn-1', entryDate: '2024-01-05', amount: new Decimal('1000'), isCredit: true }),
        makeTransaction({ id: 'txn-2', entryDate: '2024-01-10', amount: new Decimal('250.50'), isCredit: false }),
        makeTransaction({ id: 'txn-3', entryDate: '2024-01-15', amount: new Decimal('750'), isCredit: true }),
        makeTransaction({ id: 'txn-4', entryDate: '2024-01-20', amount: new Decimal('100'), isCredit: false }),
      ],
    });

    const merged = mergeSingleStatement([stmt]);

    const expected = new Decimal('5000').plus('1000').minus('250.50').plus('750').minus('100');
    expect(merged.closingBalance.amount.equals(expected)).toBe(true);
    expect(merged.closingBalance.date).toBe('2024-01-20');
    expect(merged.closingBalance.currency).toBe('EUR');
    expect(merged.closingBalance.isCredit).toBe(true);
  });

  it('throws error for empty statements array', () => {
    expect(() => mergeSingleStatement([])).toThrow('No statements to merge');
  });

});

describe('previewSingleStatementMerge', () => {
  it('returns eligible preview for valid statements', () => {
    const stmt = makeStatement();
    const preview = previewSingleStatementMerge([stmt]);

    expect(preview.eligible).toBe(true);
    expect(preview.merged).toBeDefined();
    expect(preview.transactionCount).toBe(1);
  });

  it('returns ineligible for multiple accounts', () => {
    const stmt1 = makeStatement({ id: 'stmt-1', accountId: 'ACC1' });
    const stmt2 = makeStatement({ id: 'stmt-2', accountId: 'ACC2' });

    const preview = previewSingleStatementMerge([stmt1, stmt2]);

    expect(preview.eligible).toBe(false);
    expect(preview.merged).toBeUndefined();
  });
});

describe('validateMergeResult', () => {
  it('validates correct merge', () => {
    const stmt = makeStatement();
    const merged = mergeSingleStatement([stmt]);
    const result = validateMergeResult([stmt], merged);

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('detects transaction count mismatch', () => {
    const stmt = makeStatement();
    const merged = mergeSingleStatement([stmt]);
    merged.transactions = [];

    const result = validateMergeResult([stmt], merged);

    expect(result.valid).toBe(false);
    expect(result.issues[0]).toContain('Transaction count mismatch');
  });

  it('detects opening balance mismatch', () => {
    const stmt = makeStatement();
    const merged = mergeSingleStatement([stmt]);
    merged.openingBalance.amount = new Decimal('9999');

    const result = validateMergeResult([stmt], merged);

    expect(result.valid).toBe(false);
    expect(result.issues).toContain('Opening balance mismatch');
  });
});

describe('transaction sorting', () => {
  it('sorts by valueDate when entryDates are equal across multiple statements', () => {
    const stmt1 = makeStatement({
      id: 'stmt-1',
      statementNumber: '001',
      openingBalance: { date: '2024-01-01', amount: new Decimal('1000'), currency: 'EUR', isCredit: true },
      closingBalance: { date: '2024-01-31', amount: new Decimal('1100'), currency: 'EUR', isCredit: true },
      transactions: [
        makeTransaction({ id: 'txn-1', entryDate: '2024-01-15', valueDate: '2024-01-20', amount: new Decimal('50') }),
      ],
    });
    const stmt2 = makeStatement({
      id: 'stmt-2',
      statementNumber: '002',
      openingBalance: { date: '2024-02-01', amount: new Decimal('1100'), currency: 'EUR', isCredit: true },
      closingBalance: { date: '2024-02-28', amount: new Decimal('1200'), currency: 'EUR', isCredit: true },
      transactions: [
        makeTransaction({ id: 'txn-2', entryDate: '2024-01-15', valueDate: '2024-01-10', amount: new Decimal('50') }),
      ],
    });

    const merged = mergeSingleStatement([stmt1, stmt2]);

    expect(merged.transactions[0].valueDate).toBe('2024-01-10');
    expect(merged.transactions[1].valueDate).toBe('2024-01-20');
  });
});
