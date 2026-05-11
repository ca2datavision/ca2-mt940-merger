import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { validateTransactions } from './transaction';

describe('validateTransactions', () => {
  it('parses valid :61: line', () => {
    const content = `:61:230115C1000,50N123REF123`;
    const { transactions, issues } = validateTransactions(content);

    expect(issues.filter(i => i.severity === 'error')).toHaveLength(0);
    expect(transactions).toHaveLength(1);
    expect(transactions[0].valueDate).toBe('2023-01-15');
    expect(transactions[0].isCredit).toBe(true);
    expect(transactions[0].amount.equals(new Decimal('1000.50'))).toBe(true);
  });

  it('parses :61: with entry date', () => {
    const content = `:61:2301150120D500,00N123REF`;
    const { transactions } = validateTransactions(content);

    expect(transactions).toHaveLength(1);
    expect(transactions[0].valueDate).toBe('2023-01-15');
    expect(transactions[0].entryDate).toBe('2023-01-20');
    expect(transactions[0].isCredit).toBe(false);
  });

  it('parses reversal markers RC/RD', () => {
    const content = `:61:230115RC100,00N123REF`;
    const { transactions } = validateTransactions(content);

    expect(transactions).toHaveLength(1);
    expect(transactions[0].isCredit).toBe(true);
  });

  it('associates :86: narrative with :61:', () => {
    const content = `:61:230115C100,00N123REF
:86:Payment description here`;
    const { transactions } = validateTransactions(content);

    expect(transactions).toHaveLength(1);
    expect(transactions[0].narrative).toBe('Payment description here');
  });

  it('reports malformed :61: lines', () => {
    const content = `:61:INVALID`;
    const { issues } = validateTransactions(content);

    const errors = issues.filter(i => i.code === 'TXN_MALFORMED_61');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('calculates transaction summary', () => {
    const content = `:61:230115C1000,00N123REF1
:61:230116D300,00N123REF2
:61:230117C200,00N123REF3`;
    const { summary } = validateTransactions(content);

    expect(summary.count).toBe(3);
    expect(summary.creditCount).toBe(2);
    expect(summary.debitCount).toBe(1);
    expect(summary.creditSum.equals(new Decimal('1200'))).toBe(true);
    expect(summary.debitSum.equals(new Decimal('300'))).toBe(true);
    expect(summary.netSum.equals(new Decimal('900'))).toBe(true);
  });

  it('reports line numbers for issues', () => {
    const content = `Some text
:61:BAD`;
    const { issues } = validateTransactions(content);

    const error = issues.find(i => i.code === 'TXN_MALFORMED_61');
    expect(error?.lineNumber).toBe(2);
  });

  it('handles empty content', () => {
    const { transactions, summary } = validateTransactions('');

    expect(transactions).toHaveLength(0);
    expect(summary.count).toBe(0);
    expect(summary.netSum.equals(new Decimal(0))).toBe(true);
  });
});
