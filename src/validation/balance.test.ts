import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  parseBalanceTag,
  validateDate,
  validateCurrency,
  validateAmount,
  parseAmount,
  convertDateToISO,
  validateCurrencyConsistency,
  validateStatementBalances,
} from './balance';

describe('parseBalanceTag', () => {
  it('parses valid opening balance', () => {
    const result = parseBalanceTag(':60F:C260501EUR1000,00');
    expect(result).toEqual({
      tag: '60F',
      creditDebit: 'C',
      date: '260501',
      currency: 'EUR',
      amount: '1000,00',
    });
  });

  it('parses debit balance', () => {
    const result = parseBalanceTag(':62F:D260510USD500,50');
    expect(result).toEqual({
      tag: '62F',
      creditDebit: 'D',
      date: '260510',
      currency: 'USD',
      amount: '500,50',
    });
  });

  it('returns null for invalid format', () => {
    expect(parseBalanceTag('invalid')).toBeNull();
    expect(parseBalanceTag(':60F:X260501EUR1000,00')).toBeNull();
  });
});

describe('validateDate', () => {
  it('accepts valid date', () => {
    expect(validateDate('260501', 'openingBalance')).toHaveLength(0);
  });

  it('rejects invalid month', () => {
    const issues = validateDate('261301', 'openingBalance');
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('INVALID_MONTH');
  });

  it('rejects invalid day', () => {
    const issues = validateDate('260532', 'openingBalance');
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('INVALID_DAY');
  });
});

describe('validateCurrency', () => {
  it('accepts valid currency', () => {
    expect(validateCurrency('EUR', 'balance')).toHaveLength(0);
    expect(validateCurrency('USD', 'balance')).toHaveLength(0);
  });

  it('rejects lowercase currency', () => {
    const issues = validateCurrency('eur', 'balance');
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('INVALID_CURRENCY');
  });
});

describe('validateAmount', () => {
  it('accepts valid amount with comma', () => {
    expect(validateAmount('1000,00', 'balance')).toHaveLength(0);
    expect(validateAmount('0,50', 'balance')).toHaveLength(0);
  });

  it('rejects amount with dot', () => {
    const issues = validateAmount('1000.00', 'balance');
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('INVALID_AMOUNT_FORMAT');
  });
});

describe('parseAmount', () => {
  it('parses comma-separated amount to absolute Decimal', () => {
    const result = parseAmount('1000,50');
    expect(result.equals(new Decimal('1000.50'))).toBe(true);
  });

  it('parses zero amount', () => {
    const result = parseAmount('0,00');
    expect(result.equals(new Decimal('0'))).toBe(true);
  });
});

describe('convertDateToISO', () => {
  it('converts 20xx dates', () => {
    expect(convertDateToISO('260501')).toBe('2026-05-01');
  });

  it('converts 19xx dates', () => {
    expect(convertDateToISO('990101')).toBe('1999-01-01');
  });
});

describe('validateCurrencyConsistency', () => {
  it('accepts matching currencies', () => {
    const opening = { date: '2026-05-01', amount: new Decimal(100), currency: 'EUR', isCredit: true };
    const closing = { date: '2026-05-10', amount: new Decimal(150), currency: 'EUR', isCredit: true };
    const issues = validateCurrencyConsistency(opening, closing, undefined);
    expect(issues).toHaveLength(0);
  });

  it('rejects mismatched currencies', () => {
    const opening = { date: '2026-05-01', amount: new Decimal(100), currency: 'EUR', isCredit: true };
    const closing = { date: '2026-05-10', amount: new Decimal(150), currency: 'USD', isCredit: true };
    const issues = validateCurrencyConsistency(opening, closing, undefined);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('CURRENCY_MISMATCH');
  });
});

describe('validateStatementBalances', () => {
  it('requires opening balance', () => {
    const closing = { date: '2026-05-10', amount: new Decimal(150), currency: 'EUR', isCredit: true };
    const result = validateStatementBalances(undefined, closing, undefined);
    expect(result.issues.some(i => i.code === 'MISSING_OPENING_BALANCE')).toBe(true);
  });

  it('requires closing balance', () => {
    const opening = { date: '2026-05-01', amount: new Decimal(100), currency: 'EUR', isCredit: true };
    const result = validateStatementBalances(opening, undefined, undefined);
    expect(result.issues.some(i => i.code === 'MISSING_CLOSING_BALANCE')).toBe(true);
  });
});
