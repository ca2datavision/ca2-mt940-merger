import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { analyzeMergeEligibility } from './merge';
import type { Statement, ValidationIssue } from '../types/validation';

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
      amount: new Decimal('1500.00'),
      currency: 'EUR',
      isCredit: true,
    },
    transactions: [],
    ...overrides,
  };
}

describe('analyzeMergeEligibility', () => {
  describe('multi-message merge', () => {
    it('returns eligible when all statements are valid', () => {
      const statements = [makeStatement()];
      const result = analyzeMergeEligibility(statements, []);

      expect(result.multiMessage.eligible).toBe(true);
      expect(result.multiMessage.blockers).toHaveLength(0);
    });

    it('returns ineligible when validation errors exist', () => {
      const statements = [makeStatement()];
      const issues: ValidationIssue[] = [
        { severity: 'error', code: 'TEST_ERROR', message: 'Test error' },
      ];
      const result = analyzeMergeEligibility(statements, issues);

      expect(result.multiMessage.eligible).toBe(false);
      expect(result.multiMessage.blockers).toHaveLength(1);
    });

    it('returns ineligible when no statements', () => {
      const result = analyzeMergeEligibility([], []);

      expect(result.multiMessage.eligible).toBe(false);
      expect(result.multiMessage.blockers[0].code).toBe('MERGE_NO_STATEMENTS');
    });

    it('includes warnings but remains eligible', () => {
      const statements = [makeStatement()];
      const issues: ValidationIssue[] = [
        { severity: 'warning', code: 'TEST_WARN', message: 'Test warning' },
      ];
      const result = analyzeMergeEligibility(statements, issues);

      expect(result.multiMessage.eligible).toBe(true);
      expect(result.multiMessage.warnings).toHaveLength(1);
    });
  });

  describe('single-statement merge', () => {
    it('returns eligible for single statement', () => {
      const statements = [makeStatement()];
      const result = analyzeMergeEligibility(statements, []);

      expect(result.singleStatement.eligible).toBe(true);
    });

    it('returns eligible for continuous statements', () => {
      const stmt1 = makeStatement({
        id: 'stmt-1',
        statementNumber: '001',
        openingBalance: { date: '2024-01-01', amount: new Decimal('1000'), currency: 'EUR', isCredit: true },
        closingBalance: { date: '2024-01-31', amount: new Decimal('1500'), currency: 'EUR', isCredit: true },
      });
      const stmt2 = makeStatement({
        id: 'stmt-2',
        statementNumber: '002',
        openingBalance: { date: '2024-02-01', amount: new Decimal('1500'), currency: 'EUR', isCredit: true },
        closingBalance: { date: '2024-02-28', amount: new Decimal('2000'), currency: 'EUR', isCredit: true },
      });

      const result = analyzeMergeEligibility([stmt1, stmt2], []);

      expect(result.singleStatement.eligible).toBe(true);
    });

    it('returns ineligible for multiple accounts', () => {
      const stmt1 = makeStatement({ id: 'stmt-1', accountId: 'ACC1' });
      const stmt2 = makeStatement({ id: 'stmt-2', accountId: 'ACC2' });

      const result = analyzeMergeEligibility([stmt1, stmt2], []);

      expect(result.singleStatement.eligible).toBe(false);
      expect(result.singleStatement.blockers.some(b => b.code === 'MERGE_MULTIPLE_ACCOUNTS')).toBe(true);
    });

    it('returns ineligible for multiple currencies', () => {
      const stmt1 = makeStatement({
        id: 'stmt-1',
        openingBalance: { date: '2024-01-01', amount: new Decimal('1000'), currency: 'EUR', isCredit: true },
        closingBalance: { date: '2024-01-31', amount: new Decimal('1500'), currency: 'EUR', isCredit: true },
      });
      const stmt2 = makeStatement({
        id: 'stmt-2',
        openingBalance: { date: '2024-02-01', amount: new Decimal('1500'), currency: 'USD', isCredit: true },
        closingBalance: { date: '2024-02-28', amount: new Decimal('2000'), currency: 'USD', isCredit: true },
      });

      const result = analyzeMergeEligibility([stmt1, stmt2], []);

      expect(result.singleStatement.eligible).toBe(false);
      expect(result.singleStatement.blockers.some(b => b.code === 'MERGE_MULTIPLE_CURRENCIES')).toBe(true);
    });

    it('returns ineligible for balance gap', () => {
      const stmt1 = makeStatement({
        id: 'stmt-1',
        statementNumber: '001',
        openingBalance: { date: '2024-01-01', amount: new Decimal('1000'), currency: 'EUR', isCredit: true },
        closingBalance: { date: '2024-01-31', amount: new Decimal('1500'), currency: 'EUR', isCredit: true },
      });
      const stmt2 = makeStatement({
        id: 'stmt-2',
        statementNumber: '002',
        openingBalance: { date: '2024-02-01', amount: new Decimal('1600'), currency: 'EUR', isCredit: true },
        closingBalance: { date: '2024-02-28', amount: new Decimal('2000'), currency: 'EUR', isCredit: true },
      });

      const result = analyzeMergeEligibility([stmt1, stmt2], []);

      expect(result.singleStatement.eligible).toBe(false);
      expect(result.singleStatement.blockers.some(b => b.code === 'MERGE_BALANCE_GAP')).toBe(true);
    });
  });
});
