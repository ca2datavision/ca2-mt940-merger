import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  groupStatements,
  sortStatements,
  detectDuplicateStatementNumbers,
  detectOutOfOrder,
  validateBalanceContinuity,
  validateContinuity,
} from './continuity';
import type { Statement, Balance } from '../types/validation';

function makeBalance(amount: number, date: string, currency = 'EUR'): Balance {
  return {
    date,
    amount: new Decimal(Math.abs(amount)),
    currency,
    isCredit: amount >= 0,
  };
}

function makeStatement(
  id: string,
  accountId: string,
  stmtNumber: string,
  openingAmount: number,
  closingAmount: number,
  openingDate: string,
  closingDate: string,
  currency = 'EUR'
): Statement {
  return {
    id,
    fileId: 'file1',
    accountId,
    statementNumber: stmtNumber,
    sequenceNumber: '1',
    openingBalance: makeBalance(openingAmount, openingDate, currency),
    closingBalance: makeBalance(closingAmount, closingDate, currency),
    transactions: [],
  };
}

describe('groupStatements', () => {
  it('groups by account and currency', () => {
    const statements = [
      makeStatement('1', 'ACC1', '1', 100, 150, '2026-05-01', '2026-05-05'),
      makeStatement('2', 'ACC2', '1', 200, 250, '2026-05-01', '2026-05-05'),
      makeStatement('3', 'ACC1', '2', 150, 200, '2026-05-06', '2026-05-10'),
    ];

    const groups = groupStatements(statements);
    expect(groups).toHaveLength(2);
    expect(groups.find(g => g.accountId === 'ACC1')?.statements).toHaveLength(2);
    expect(groups.find(g => g.accountId === 'ACC2')?.statements).toHaveLength(1);
  });
});

describe('sortStatements', () => {
  it('sorts by date then statement number', () => {
    const statements = [
      makeStatement('3', 'ACC1', '3', 200, 250, '2026-05-10', '2026-05-15'),
      makeStatement('1', 'ACC1', '1', 100, 150, '2026-05-01', '2026-05-05'),
      makeStatement('2', 'ACC1', '2', 150, 200, '2026-05-05', '2026-05-10'),
    ];

    const sorted = sortStatements(statements);
    expect(sorted[0].statementNumber).toBe('1');
    expect(sorted[1].statementNumber).toBe('2');
    expect(sorted[2].statementNumber).toBe('3');
  });
});

describe('detectDuplicateStatementNumbers', () => {
  it('detects duplicates', () => {
    const statements = [
      makeStatement('1', 'ACC1', '1', 100, 150, '2026-05-01', '2026-05-05'),
      makeStatement('2', 'ACC1', '1', 150, 200, '2026-05-05', '2026-05-10'),
    ];

    const issues = detectDuplicateStatementNumbers(statements);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('DUPLICATE_STATEMENT_NUMBER');
  });

  it('allows unique numbers', () => {
    const statements = [
      makeStatement('1', 'ACC1', '1', 100, 150, '2026-05-01', '2026-05-05'),
      makeStatement('2', 'ACC1', '2', 150, 200, '2026-05-05', '2026-05-10'),
    ];

    const issues = detectDuplicateStatementNumbers(statements);
    expect(issues).toHaveLength(0);
  });
});

describe('validateBalanceContinuity', () => {
  it('validates continuous balances', () => {
    const statements = [
      makeStatement('1', 'ACC1', '1', 100, 150, '2026-05-01', '2026-05-05'),
      makeStatement('2', 'ACC1', '2', 150, 200, '2026-05-05', '2026-05-10'),
    ];

    const issues = validateBalanceContinuity(statements);
    expect(issues).toHaveLength(0);
  });

  it('detects discontinuity', () => {
    const statements = [
      makeStatement('1', 'ACC1', '1', 100, 150, '2026-05-01', '2026-05-05'),
      makeStatement('2', 'ACC1', '2', 160, 200, '2026-05-05', '2026-05-10'),
    ];

    const issues = validateBalanceContinuity(statements);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('BALANCE_DISCONTINUITY');
  });
});

describe('validateContinuity', () => {
  it('warns about multiple accounts', () => {
    const statements = [
      makeStatement('1', 'ACC1', '1', 100, 150, '2026-05-01', '2026-05-05'),
      makeStatement('2', 'ACC2', '1', 200, 250, '2026-05-01', '2026-05-05'),
    ];

    const result = validateContinuity(statements);
    expect(result.multipleAccounts).toBe(true);
    expect(result.issues.some(i => i.code === 'MULTIPLE_ACCOUNTS')).toBe(true);
  });

  it('validates single account stream', () => {
    const statements = [
      makeStatement('1', 'ACC1', '1', 100, 150, '2026-05-01', '2026-05-05'),
      makeStatement('2', 'ACC1', '2', 150, 200, '2026-05-05', '2026-05-10'),
    ];

    const result = validateContinuity(statements);
    expect(result.multipleAccounts).toBe(false);
    expect(result.issues).toHaveLength(0);
  });
});
