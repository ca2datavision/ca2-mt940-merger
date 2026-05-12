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

  describe('subset selection filtering', () => {
    it('returns eligible when passed only issues for selected files (no errors)', () => {
      const validStatement = makeStatement({ id: 'stmt-1', fileId: 'file-valid' });
      const filteredIssues: ValidationIssue[] = [];

      const result = analyzeMergeEligibility([validStatement], filteredIssues);

      expect(result.multiMessage.eligible).toBe(true);
      expect(result.multiMessage.blockers).toHaveLength(0);
    });

    it('returns ineligible when passed issues include errors', () => {
      const statement = makeStatement({ id: 'stmt-1', fileId: 'file-1' });
      const issuesForSelectedFile: ValidationIssue[] = [
        { severity: 'error', code: 'TEST_ERROR', message: 'Error in selected file', fileId: 'file-1' },
      ];

      const result = analyzeMergeEligibility([statement], issuesForSelectedFile);

      expect(result.multiMessage.eligible).toBe(false);
      expect(result.multiMessage.blockers).toHaveLength(1);
    });

    it('pre-filtering issues by fileId enables subset merge', () => {
      const stmt1 = makeStatement({ id: 'stmt-1', fileId: 'file-1' });
      const stmt2 = makeStatement({ id: 'stmt-2', fileId: 'file-2' });
      const mixedIssues: ValidationIssue[] = [
        { severity: 'error', code: 'ERR1', message: 'Error file 1', fileId: 'file-1' },
        { severity: 'error', code: 'ERR2', message: 'Error file 2', fileId: 'file-2' },
      ];

      const file1Issues = mixedIssues.filter(i => i.fileId === 'file-1');
      const file2Issues = mixedIssues.filter(i => i.fileId === 'file-2');

      const resultWithFile1Issues = analyzeMergeEligibility([stmt1], file1Issues);
      expect(resultWithFile1Issues.multiMessage.eligible).toBe(false);

      const resultWithNoIssues = analyzeMergeEligibility([stmt1], []);
      expect(resultWithNoIssues.multiMessage.eligible).toBe(true);

      const resultFile2WithFile2Issues = analyzeMergeEligibility([stmt2], file2Issues);
      expect(resultFile2WithFile2Issues.multiMessage.eligible).toBe(false);

      const resultFile2WithNoIssues = analyzeMergeEligibility([stmt2], []);
      expect(resultFile2WithNoIssues.multiMessage.eligible).toBe(true);
    });
  });
});
