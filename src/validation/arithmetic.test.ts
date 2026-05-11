import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  calculateTransactionTotals,
  getSignedBalance,
  validateArithmetic,
  formatBreakdown,
} from './arithmetic';
import type { Balance, Transaction } from '../types/validation';

function makeTransaction(amount: number): Transaction {
  return {
    id: 'tx1',
    fingerprint: 'fp1',
    entryDate: '2026-05-05',
    valueDate: '2026-05-05',
    amount: new Decimal(Math.abs(amount)),
    currency: 'EUR',
    isCredit: amount >= 0,
    transactionType: 'NTRF',
    customerReference: 'REF',
    bankReference: '',
    description: 'Test',
  };
}

function makeBalance(amount: number, isCredit: boolean): Balance {
  return {
    date: '2026-05-01',
    amount: new Decimal(Math.abs(amount)),
    currency: 'EUR',
    isCredit,
  };
}

describe('calculateTransactionTotals', () => {
  it('calculates totals for mixed transactions', () => {
    const transactions = [
      makeTransaction(100),
      makeTransaction(-50),
      makeTransaction(200),
      makeTransaction(-30),
    ];
    const result = calculateTransactionTotals(transactions);

    expect(result.totalCredits.equals(new Decimal(300))).toBe(true);
    expect(result.totalDebits.equals(new Decimal(80))).toBe(true);
    expect(result.net.equals(new Decimal(220))).toBe(true);
  });

  it('handles empty transactions', () => {
    const result = calculateTransactionTotals([]);
    expect(result.totalCredits.isZero()).toBe(true);
    expect(result.totalDebits.isZero()).toBe(true);
    expect(result.net.isZero()).toBe(true);
  });
});

describe('getSignedBalance', () => {
  it('returns positive for credit', () => {
    const balance = makeBalance(100, true);
    expect(getSignedBalance(balance).equals(new Decimal(100))).toBe(true);
  });

  it('returns negative for debit', () => {
    const balance = makeBalance(100, false);
    expect(getSignedBalance(balance).equals(new Decimal(-100))).toBe(true);
  });
});

describe('validateArithmetic', () => {
  it('validates balanced statement', () => {
    const opening = makeBalance(1000, true);
    const closing = makeBalance(1220, true);
    const transactions = [
      makeTransaction(100),
      makeTransaction(-50),
      makeTransaction(200),
      makeTransaction(-30),
    ];

    const result = validateArithmetic(opening, closing, transactions);

    expect(result.breakdown.isBalanced).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('detects arithmetic mismatch', () => {
    const opening = makeBalance(1000, true);
    const closing = makeBalance(1300, true);
    const transactions = [
      makeTransaction(100),
      makeTransaction(-50),
    ];

    const result = validateArithmetic(opening, closing, transactions);

    expect(result.breakdown.isBalanced).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].code).toBe('ARITHMETIC_MISMATCH');
  });

  it('handles debit opening balance', () => {
    const opening = makeBalance(100, false);
    const closing = makeBalance(150, true);
    const transactions = [makeTransaction(250)];

    const result = validateArithmetic(opening, closing, transactions);

    expect(result.breakdown.isBalanced).toBe(true);
    expect(result.breakdown.opening.equals(new Decimal(-100))).toBe(true);
  });
});

describe('formatBreakdown', () => {
  it('formats balanced breakdown', () => {
    const breakdown = {
      opening: new Decimal(1000),
      totalDebits: new Decimal(80),
      totalCredits: new Decimal(300),
      netTransactions: new Decimal(220),
      expectedClosing: new Decimal(1220),
      actualClosing: new Decimal(1220),
      difference: new Decimal(0),
      isBalanced: true,
    };

    const formatted = formatBreakdown(breakdown);
    expect(formatted).toContain('BALANCED');
    expect(formatted).toContain('1000.00');
  });

  it('formats mismatched breakdown', () => {
    const breakdown = {
      opening: new Decimal(1000),
      totalDebits: new Decimal(50),
      totalCredits: new Decimal(100),
      netTransactions: new Decimal(50),
      expectedClosing: new Decimal(1050),
      actualClosing: new Decimal(1100),
      difference: new Decimal(50),
      isBalanced: false,
    };

    const formatted = formatBreakdown(breakdown);
    expect(formatted).toContain('MISMATCH');
    expect(formatted).toContain('50.00');
  });
});
