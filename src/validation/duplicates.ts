import type { ValidationIssue } from '../types/validation';
import Decimal from 'decimal.js';

export interface FileInfo {
  id: string;
  name: string;
  hash: string;
}

export interface StatementInfo {
  fileId: string;
  fileName: string;
  statementIndex: number;
  accountId: string;
  currency: string;
  statementNumber: string;
  openingDate: string;
  openingAmount: Decimal;
  closingDate: string;
  closingAmount: Decimal;
}

export interface TransactionInfo {
  fileId: string;
  fileName: string;
  statementIndex: number;
  transactionIndex: number;
  accountId: string;
  currency: string;
  valueDate: string;
  entryDate?: string;
  amount: Decimal;
  isCredit: boolean;
  transactionType: string;
  reference: string;
  narrative?: string;
}

function createStatementKey(stmt: StatementInfo): string {
  return [
    stmt.accountId,
    stmt.currency,
    stmt.statementNumber,
    stmt.openingDate,
    stmt.openingAmount.toString(),
    stmt.closingDate,
    stmt.closingAmount.toString(),
  ].join('|');
}

function createTransactionFingerprint(txn: TransactionInfo): string {
  return [
    txn.accountId,
    txn.currency,
    txn.valueDate,
    txn.entryDate || '',
    txn.amount.toString(),
    txn.isCredit ? 'C' : 'D',
    txn.transactionType,
    txn.reference,
    txn.narrative || '',
  ].join('|');
}

export interface DuplicateResult {
  issues: ValidationIssue[];
  duplicateFiles: string[];
  duplicateStatements: number;
  duplicateTransactions: number;
}

export function detectDuplicateFiles(files: FileInfo[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seenHashes = new Map<string, FileInfo>();

  for (const file of files) {
    const existing = seenHashes.get(file.hash);
    if (existing) {
      issues.push({
        severity: 'warning',
        code: 'DUP_FILE',
        message: `Duplicate file detected: "${file.name}" has same content as "${existing.name}"`,
        fileId: file.id,
        fileName: file.name,
      });
    } else {
      seenHashes.set(file.hash, file);
    }
  }

  return issues;
}

export function detectDuplicateStatements(statements: StatementInfo[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seenKeys = new Map<string, StatementInfo>();

  for (const stmt of statements) {
    const key = createStatementKey(stmt);
    const existing = seenKeys.get(key);
    if (existing) {
      issues.push({
        severity: 'warning',
        code: 'DUP_STATEMENT',
        message: `Duplicate statement: account ${stmt.accountId}, statement #${stmt.statementNumber} appears in both "${existing.fileName}" and "${stmt.fileName}"`,
        fileId: stmt.fileId,
        fileName: stmt.fileName,
        statementIndex: stmt.statementIndex,
      });
    } else {
      seenKeys.set(key, stmt);
    }
  }

  return issues;
}

export function detectDuplicateTransactions(transactions: TransactionInfo[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seenFingerprints = new Map<string, TransactionInfo>();

  for (const txn of transactions) {
    const fingerprint = createTransactionFingerprint(txn);
    const existing = seenFingerprints.get(fingerprint);
    if (existing) {
      issues.push({
        severity: 'warning',
        code: 'DUP_TRANSACTION',
        message: `Duplicate transaction: ${txn.isCredit ? 'Credit' : 'Debit'} ${txn.amount} ${txn.currency} on ${txn.valueDate}`,
        fileId: txn.fileId,
        fileName: txn.fileName,
        statementIndex: txn.statementIndex,
        transactionIndex: txn.transactionIndex,
      });
    } else {
      seenFingerprints.set(fingerprint, txn);
    }
  }

  return issues;
}

export function detectAllDuplicates(
  files: FileInfo[],
  statements: StatementInfo[],
  transactions: TransactionInfo[]
): DuplicateResult {
  const fileIssues = detectDuplicateFiles(files);
  const statementIssues = detectDuplicateStatements(statements);
  const transactionIssues = detectDuplicateTransactions(transactions);

  return {
    issues: [...fileIssues, ...statementIssues, ...transactionIssues],
    duplicateFiles: fileIssues.map(i => i.fileId!).filter(Boolean),
    duplicateStatements: statementIssues.length,
    duplicateTransactions: transactionIssues.length,
  };
}
