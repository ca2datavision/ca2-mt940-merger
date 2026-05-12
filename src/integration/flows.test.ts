import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { analyzeMergeEligibility } from '../validation/merge';
import { mergeSingleStatement, validateMergeResult } from '../merge/singleStatement';
import { writeMT940 } from '../utils/mt940Writer';
import { escapeCSVField, toCSV, ENHANCED_HEADERS } from '../utils/csv';
import { validateFileContent } from '../validation/index';
import type { Statement, ValidationIssue } from '../types/validation';

describe('End-to-end flow: Statement validation to merge', () => {
  const createStatement = (
    id: string,
    accountId: string,
    openingDate: string,
    openingAmount: number,
    closingDate: string,
    closingAmount: number,
    transactions: Array<{ date: string; amount: number; isCredit: boolean }>
  ): Statement => ({
    id,
    accountId,
    statementNumber: '1',
    sequenceNumber: '1',
    openingBalance: {
      date: openingDate,
      amount: new Decimal(openingAmount),
      currency: 'EUR',
      isCredit: true,
    },
    closingBalance: {
      date: closingDate,
      amount: new Decimal(closingAmount),
      currency: 'EUR',
      isCredit: true,
    },
    transactions: transactions.map((t, i) => ({
      valueDate: t.date,
      entryDate: t.date,
      amount: new Decimal(t.amount),
      currency: 'EUR',
      isCredit: t.isCredit,
      transactionType: 'NMSC',
      customerReference: `REF${i}`,
      description: `Transaction ${i}`,
    })),
  });

  describe('single account merge flow', () => {
    const statements: Statement[] = [
      createStatement('s1', 'ACC123', '2024-01-01', 1000, '2024-01-15', 1200, [
        { date: '2024-01-10', amount: 200, isCredit: true },
      ]),
      createStatement('s2', 'ACC123', '2024-01-15', 1200, '2024-01-31', 1500, [
        { date: '2024-01-20', amount: 300, isCredit: true },
      ]),
    ];

    it('analyzes eligibility correctly for compatible statements', () => {
      const result = analyzeMergeEligibility(statements, []);
      expect(result.multiMessage.eligible).toBe(true);
      expect(result.singleStatement.eligible).toBe(true);
    });

    it('merges statements and recalculates balance', () => {
      const merged = mergeSingleStatement(statements);
      expect(merged.accountId).toBe('ACC123');
      expect(merged.transactions.length).toBe(2);
      expect(merged.openingBalance.amount.equals(1000)).toBe(true);
      expect(merged.closingBalance.amount.equals(1500)).toBe(true);
    });

    it('validates merge result', () => {
      const merged = mergeSingleStatement(statements);
      const validation = validateMergeResult(statements, merged);
      expect(validation.valid).toBe(true);
      expect(validation.issues).toEqual([]);
    });
  });

  describe('multi-account rejection flow', () => {
    const statements: Statement[] = [
      createStatement('s1', 'ACC123', '2024-01-01', 1000, '2024-01-15', 1200, []),
      createStatement('s2', 'ACC456', '2024-01-15', 500, '2024-01-31', 700, []),
    ];

    it('rejects single-statement merge for different accounts', () => {
      const result = analyzeMergeEligibility(statements, []);
      expect(result.singleStatement.eligible).toBe(false);
      expect(result.singleStatement.blockers.length).toBeGreaterThan(0);
    });

    it('allows multi-message merge for different accounts', () => {
      const result = analyzeMergeEligibility(statements, []);
      expect(result.multiMessage.eligible).toBe(true);
    });
  });

  describe('error blocking flow', () => {
    const statements: Statement[] = [
      createStatement('s1', 'ACC123', '2024-01-01', 1000, '2024-01-15', 1200, []),
      createStatement('s2', 'ACC123', '2024-01-15', 1200, '2024-01-31', 1400, []),
    ];

    const issues: ValidationIssue[] = [
      { severity: 'error', code: 'BALANCE_MISMATCH', message: 'Balance error' },
    ];

    it('blocks multi-message merge when errors exist', () => {
      const result = analyzeMergeEligibility(statements, issues);
      expect(result.multiMessage.eligible).toBe(false);
    });

    it('blocks single-statement merge when errors exist', () => {
      const result = analyzeMergeEligibility(statements, issues);
      expect(result.singleStatement.eligible).toBe(false);
    });
  });
});

describe('End-to-end flow: CSV export', () => {
  it('generates valid CSV with proper escaping', () => {
    const headers = ['name', 'value', 'notes'];
    const rows = [
      { name: 'Test', value: '100', notes: 'Simple' },
      { name: 'With, comma', value: '200', notes: 'Has comma' },
      { name: 'With "quotes"', value: '300', notes: 'Has quotes' },
    ];

    const csv = toCSV(headers, rows);
    const lines = csv.split('\n');

    expect(lines.length).toBe(4);
    expect(lines[0]).toBe('name,value,notes');
    expect(lines[1]).toBe('Test,100,Simple');
    expect(lines[2]).toBe('"With, comma",200,Has comma');
    expect(lines[3]).toBe('"With ""quotes""",300,Has quotes');
  });

  it('prevents formula injection', () => {
    expect(escapeCSVField('=SUM(A1)')).toBe("\"'=SUM(A1)\"");
    expect(escapeCSVField('+100')).toBe("\"'+100\"");
    expect(escapeCSVField('-100')).toBe("\"'-100\"");
    expect(escapeCSVField('@formula')).toBe("\"'@formula\"");
  });

  it('enhanced CSV has all expected headers', () => {
    expect(ENHANCED_HEADERS).toContain('source_file');
    expect(ENHANCED_HEADERS).toContain('account_id');
    expect(ENHANCED_HEADERS).toContain('signed_amount');
    expect(ENHANCED_HEADERS).toContain('fingerprint');
    expect(ENHANCED_HEADERS.length).toBe(19);
  });
});

describe('End-to-end flow: MT940 output', () => {
  it('generates valid MT940 output', () => {
    const statements = [{
      accountId: 'RO49AAAA1B31007593840000',
      statementNumber: '1',
      sequenceNumber: '1',
      openingBalance: {
        indicator: 'C' as const,
        date: '2024-01-01',
        currency: 'EUR',
        amount: '1000.00',
      },
      closingBalance: {
        indicator: 'C' as const,
        date: '2024-01-31',
        currency: 'EUR',
        amount: '1200.00',
      },
      transactions: [{
        valueDate: '2024-01-15',
        entryDate: '2024-01-15',
        debitCredit: 'C' as const,
        amount: '200.00',
        transactionType: 'NMSC',
        reference: 'REF001',
        description: 'Test payment',
      }],
    }];

    const output = writeMT940(statements);

    expect(output).toContain(':20:');
    expect(output).toContain(':25:');
    expect(output).toContain(':28C:');
    expect(output).toContain(':60F:');
    expect(output).toContain(':61:');
    expect(output).toContain(':62F:');
    expect(output).toContain('RO49AAAA1B31007593840000');
  });
});

describe('Round-trip validation: merge → write → parse → validate', () => {
  it('merged output validates cleanly when re-imported', () => {
    const writable = [{
      accountId: 'RO49TEST123456789',
      statementNumber: '1',
      sequenceNumber: '1',
      openingBalance: { date: '2024-01-01', amount: '1000.00', currency: 'EUR', isCredit: true },
      closingBalance: { date: '2024-01-31', amount: '1500.00', currency: 'EUR', isCredit: true },
      transactions: [
        { valueDate: '2024-01-10', entryDate: '2024-01-10', amount: '200.00', isCredit: true, transactionType: 'NMSC', reference: 'REF001', description: 'Credit 1' },
        { valueDate: '2024-01-20', entryDate: '2024-01-20', amount: '300.00', isCredit: true, transactionType: 'NMSC', reference: 'REF002', description: 'Credit 2' },
      ],
    }];

    const mt940Output = writeMT940(writable).replace(/\r\n/g, '\n');
    const result = validateFileContent(mt940Output, 'test-file', 'roundtrip.mt940');

    const errors = result.issues.filter((i: ValidationIssue) => i.severity === 'error');
    expect(errors).toHaveLength(0);
    expect(result.statements).toHaveLength(1);
    expect(result.statements[0].transactions).toHaveLength(2);
  });

  it('preserves D/C indicator through round-trip', () => {
    const writable = [{
      accountId: 'RO49TEST987654321',
      statementNumber: '1',
      sequenceNumber: '1',
      openingBalance: { date: '2024-01-01', amount: '500.00', currency: 'EUR', isCredit: false },
      closingBalance: { date: '2024-01-31', amount: '700.00', currency: 'EUR', isCredit: false },
      transactions: [
        { valueDate: '2024-01-10', entryDate: '2024-01-10', amount: '100.00', isCredit: true, transactionType: 'NMSC', reference: 'CREDIT1', description: 'Credit' },
        { valueDate: '2024-01-20', entryDate: '2024-01-20', amount: '300.00', isCredit: false, transactionType: 'NMSC', reference: 'DEBIT1', description: 'Debit' },
      ],
    }];

    const mt940Output = writeMT940(writable).replace(/\r\n/g, '\n');

    expect(mt940Output).toContain(':60F:D');
    expect(mt940Output).toContain(':62F:D');
    expect(mt940Output).toMatch(/:61:\d+C100,00/);
    expect(mt940Output).toMatch(/:61:\d+D300,00/);

    const result = validateFileContent(mt940Output, 'test-file', 'roundtrip-dc.mt940');

    const errors = result.issues.filter((i: ValidationIssue) => i.severity === 'error');
    expect(errors).toHaveLength(0);

    expect(result.statements[0].openingBalance.isCredit).toBe(false);
    expect(result.statements[0].closingBalance.isCredit).toBe(false);

    const creditTx = result.statements[0].transactions.find((t: { customerReference: string }) => t.customerReference === 'CREDIT1');
    const debitTx = result.statements[0].transactions.find((t: { customerReference: string }) => t.customerReference === 'DEBIT1');
    expect(creditTx?.isCredit).toBe(true);
    expect(debitTx?.isCredit).toBe(false);
  });

  it('fails validation if D/C indicator is flipped', () => {
    const writable = [{
      accountId: 'RO49TEST111222333',
      statementNumber: '1',
      sequenceNumber: '1',
      openingBalance: { date: '2024-01-01', amount: '1000.00', currency: 'EUR', isCredit: true },
      closingBalance: { date: '2024-01-31', amount: '800.00', currency: 'EUR', isCredit: false },
      transactions: [
        { valueDate: '2024-01-15', entryDate: '2024-01-15', amount: '200.00', isCredit: false, transactionType: 'NMSC', reference: 'DEBIT1', description: 'Debit' },
      ],
    }];

    const mt940Output = writeMT940(writable).replace(/\r\n/g, '\n');
    const result = validateFileContent(mt940Output, 'test-file', 'flipped.mt940');

    const errors = result.issues.filter((i: ValidationIssue) => i.severity === 'error');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('preserves :61: supplementary details through round-trip', () => {
    const writable = [{
      accountId: 'RO49TESTSUPPL',
      statementNumber: '1',
      sequenceNumber: '1',
      openingBalance: { date: '2024-01-01', amount: '1000.00', currency: 'EUR', isCredit: true },
      closingBalance: { date: '2024-01-31', amount: '1100.00', currency: 'EUR', isCredit: true },
      transactions: [
        {
          valueDate: '2024-01-15',
          entryDate: '2024-01-15',
          amount: '100.00',
          isCredit: true,
          transactionType: 'NMSC',
          reference: 'REF001',
          description: 'Payment',
          supplementaryDetails: 'PLATA ZILIER',
        },
      ],
    }];

    const mt940Output = writeMT940(writable).replace(/\r\n/g, '\n');

    expect(mt940Output).toContain(':61:');
    expect(mt940Output).toContain('PLATA ZILIER');

    const result = validateFileContent(mt940Output, 'test-file', 'supplementary.mt940');
    const errors = result.issues.filter((i: ValidationIssue) => i.severity === 'error');
    expect(errors).toHaveLength(0);
    expect(result.statements[0].transactions[0].supplementaryDetails).toBe('PLATA ZILIER');
  });

  it('round-trips long narrative without validation errors', () => {
    const longDesc = 'Payment for services: ' + 'consulting development testing '.repeat(20);
    const writable = [{
      accountId: 'RO49TESTNARRATIVE',
      statementNumber: '1',
      sequenceNumber: '1',
      openingBalance: { date: '2024-01-01', amount: '1000.00', currency: 'EUR', isCredit: true },
      closingBalance: { date: '2024-01-31', amount: '1100.00', currency: 'EUR', isCredit: true },
      transactions: [
        { valueDate: '2024-01-15', entryDate: '2024-01-15', amount: '100.00', isCredit: true, transactionType: 'NMSC', reference: 'REF001', description: longDesc },
      ],
    }];

    const mt940Output = writeMT940(writable).replace(/\r\n/g, '\n');
    const result = validateFileContent(mt940Output, 'test-file', 'long-narrative.mt940');

    const errors = result.issues.filter((i: ValidationIssue) => i.severity === 'error');
    expect(errors).toHaveLength(0);
    expect(result.statements).toHaveLength(1);
    expect(result.statements[0].transactions).toHaveLength(1);
  });
});
