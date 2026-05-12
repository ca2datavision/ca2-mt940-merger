import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  detectDuplicateFiles,
  detectDuplicateStatements,
  detectDuplicateTransactions,
  detectAllDuplicates,
  FileInfo,
  StatementInfo,
  TransactionInfo,
} from './duplicates';

describe('detectDuplicateFiles', () => {
  it('detects files with same hash', () => {
    const files: FileInfo[] = [
      { id: '1', name: 'file1.sta', hash: 'abc123' },
      { id: '2', name: 'file2.sta', hash: 'abc123' },
    ];

    const issues = detectDuplicateFiles(files);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('DUP_FILE');
    expect(issues[0].severity).toBe('warning');
  });

  it('allows unique files', () => {
    const files: FileInfo[] = [
      { id: '1', name: 'file1.sta', hash: 'abc123' },
      { id: '2', name: 'file2.sta', hash: 'def456' },
    ];

    const issues = detectDuplicateFiles(files);
    expect(issues).toHaveLength(0);
  });
});

describe('detectDuplicateStatements', () => {
  const baseStatement: StatementInfo = {
    fileId: '1',
    fileName: 'file1.sta',
    statementIndex: 0,
    accountId: 'ACC123',
    currency: 'EUR',
    statementNumber: '1',
    openingDate: '2023-01-01',
    openingAmount: new Decimal('1000'),
    closingDate: '2023-01-31',
    closingAmount: new Decimal('1500'),
  };

  it('detects duplicate statements', () => {
    const statements: StatementInfo[] = [
      baseStatement,
      { ...baseStatement, fileId: '2', fileName: 'file2.sta' },
    ];

    const issues = detectDuplicateStatements(statements);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('DUP_STATEMENT');
  });

  it('allows different statements', () => {
    const statements: StatementInfo[] = [
      baseStatement,
      { ...baseStatement, statementNumber: '2' },
    ];

    const issues = detectDuplicateStatements(statements);
    expect(issues).toHaveLength(0);
  });
});

describe('detectDuplicateTransactions', () => {
  const baseTxn: TransactionInfo = {
    fileId: '1',
    fileName: 'file1.sta',
    statementIndex: 0,
    transactionIndex: 0,
    accountId: 'ACC123',
    currency: 'EUR',
    valueDate: '2023-01-15',
    amount: new Decimal('100'),
    isCredit: true,
    transactionType: 'N123',
    reference: 'REF001',
  };

  it('detects duplicate transactions', () => {
    const transactions: TransactionInfo[] = [
      baseTxn,
      { ...baseTxn, transactionIndex: 1 },
    ];

    const issues = detectDuplicateTransactions(transactions);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('DUP_TRANSACTION');
  });

  it('allows different transactions', () => {
    const transactions: TransactionInfo[] = [
      baseTxn,
      { ...baseTxn, amount: new Decimal('200') },
    ];

    const issues = detectDuplicateTransactions(transactions);
    expect(issues).toHaveLength(0);
  });

  it('considers narrative in fingerprint', () => {
    const transactions: TransactionInfo[] = [
      { ...baseTxn, narrative: 'Payment A' },
      { ...baseTxn, narrative: 'Payment B' },
    ];

    const issues = detectDuplicateTransactions(transactions);
    expect(issues).toHaveLength(0);
  });

  it('considers debit/credit in fingerprint', () => {
    const transactions: TransactionInfo[] = [
      { ...baseTxn, isCredit: true },
      { ...baseTxn, isCredit: false },
    ];

    const issues = detectDuplicateTransactions(transactions);
    expect(issues).toHaveLength(0);
  });
});

describe('detectAllDuplicates', () => {
  it('combines all duplicate checks', () => {
    const files: FileInfo[] = [
      { id: '1', name: 'file1.sta', hash: 'abc' },
      { id: '2', name: 'file2.sta', hash: 'abc' },
    ];

    const result = detectAllDuplicates(files, [], []);
    expect(result.duplicateFiles).toHaveLength(1);
    expect(result.issues).toHaveLength(1);
  });
});
