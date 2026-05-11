import type { ValidationIssue, Balance, Transaction, Statement } from '../types/validation';
import { validateStructure } from './structural';
import { validateTransactions, type ParsedTransaction, parse61Line } from './transaction';
import { parseForwardBalances } from './forwardBalance';
import { parseBalanceTag, validateRawBalance, validateStatementBalances } from './balance';
import { validateArithmetic } from './arithmetic';

export interface FileValidationResult {
  fileId: string;
  fileName: string;
  issues: ValidationIssue[];
  transactionCount: number;
  hasStructuralErrors: boolean;
  statements: Statement[];
}

interface ParsedStatementData {
  accountId: string;
  statementNumber: string;
  sequenceNumber: string;
  openingBalance?: Balance;
  closingBalance?: Balance;
  availableBalance?: Balance;
  transactions: ParsedTransaction[];
}

function parseStatementBlocks(content: string): ParsedStatementData[] {
  const statements: ParsedStatementData[] = [];
  const lines = content.split('\n');

  let current: ParsedStatementData | null = null;
  let pendingTxn: ParsedTransaction | null = null;
  let lineNum = 0;

  for (const line of lines) {
    lineNum++;

    // Statement terminator (hyphen on its own line)
    if (line.trim() === '-') {
      if (pendingTxn && current) {
        current.transactions.push(pendingTxn);
        pendingTxn = null;
      }
      if (current) {
        statements.push(current);
        current = null;
      }
      continue;
    }

    // Account identification :25: starts new statement
    const accountMatch = line.match(/^:25:(.+)/);
    if (accountMatch) {
      if (pendingTxn && current) {
        current.transactions.push(pendingTxn);
        pendingTxn = null;
      }
      if (current) statements.push(current);
      current = {
        accountId: accountMatch[1].trim(),
        statementNumber: '',
        sequenceNumber: '',
        transactions: [],
      };
      continue;
    }

    if (!current) continue;

    // Statement number :28C:
    const stmtNumMatch = line.match(/^:28C?:(\d+)\/?(\d*)/);
    if (stmtNumMatch) {
      current.statementNumber = stmtNumMatch[1];
      current.sequenceNumber = stmtNumMatch[2] || '1';
      continue;
    }

    // Opening balance :60F: or :60M:
    const openingMatch = line.match(/^:(60[FM]):(.+)/);
    if (openingMatch) {
      const raw = parseBalanceTag(`:${openingMatch[1]}:${openingMatch[2]}`);
      if (raw) {
        const result = validateRawBalance(raw, 'openingBalance');
        if (result.balance) current.openingBalance = result.balance;
      }
      continue;
    }

    // Transaction :61:
    const txnMatch = line.match(/^:61:(.+)/);
    if (txnMatch) {
      if (pendingTxn) current.transactions.push(pendingTxn);
      const txnContent = txnMatch[1];
      pendingTxn = parse61Content(txnContent, lineNum);
      continue;
    }

    // Narrative :86: (belongs to pending transaction)
    const narrativeMatch = line.match(/^:86:(.+)/);
    if (narrativeMatch && pendingTxn) {
      pendingTxn.narrative = narrativeMatch[1];
      pendingTxn.narrativeLineNumber = lineNum;
      continue;
    }

    // Closing balance :62F: or :62M:
    const closingMatch = line.match(/^:(62[FM]):(.+)/);
    if (closingMatch) {
      if (pendingTxn) {
        current.transactions.push(pendingTxn);
        pendingTxn = null;
      }
      const raw = parseBalanceTag(`:${closingMatch[1]}:${closingMatch[2]}`);
      if (raw) {
        const result = validateRawBalance(raw, 'closingBalance');
        if (result.balance) current.closingBalance = result.balance;
      }
      continue;
    }

    // Available balance :64:
    const availableMatch = line.match(/^:64:(.+)/);
    if (availableMatch) {
      const raw = parseBalanceTag(`:64:${availableMatch[1]}`);
      if (raw) {
        const result = validateRawBalance(raw, 'availableBalance');
        if (result.balance) current.availableBalance = result.balance;
      }
      continue;
    }
  }

  if (pendingTxn && current) current.transactions.push(pendingTxn);
  if (current) statements.push(current);
  return statements;
}

function parse61Content(content: string, lineNumber: number): ParsedTransaction | null {
  const result = parse61Line(content);

  // Gate malformed transactions: require valid amount and isCredit
  if (result.errors.length > 0 || !result.amount || result.isCredit === undefined) {
    return null;
  }

  const effectiveCredit = result.isReversal ? !result.isCredit : result.isCredit;
  return {
    lineNumber,
    valueDate: result.valueDate || '',
    entryDate: result.entryDate,
    isCredit: result.isCredit,
    isReversal: result.isReversal,
    effectiveIsCredit: effectiveCredit,
    amount: result.amount,
    transactionType: result.transactionType || '',
    reference: result.reference || '',
  };
}

function convertTransaction(txn: ParsedTransaction, currency: string, index: number): Transaction {
  return {
    id: `txn-${index}`,
    fingerprint: `${txn.valueDate}-${txn.amount}-${txn.isCredit ? 'C' : 'D'}-${txn.reference}`,
    entryDate: txn.entryDate || txn.valueDate,
    valueDate: txn.valueDate,
    amount: txn.amount,
    currency,
    isCredit: txn.effectiveIsCredit,
    transactionType: txn.transactionType,
    customerReference: txn.reference,
    bankReference: '',
    description: txn.narrative || '',
  };
}

export function validateFileContent(
  content: string,
  fileId: string,
  fileName: string
): FileValidationResult {
  const issues: ValidationIssue[] = [];
  const statements: Statement[] = [];

  // Structural validation
  const structuralIssues = validateStructure(content, fileId, fileName);
  issues.push(...structuralIssues);

  const hasStructuralErrors = structuralIssues.some(i => i.severity === 'error');

  // Transaction validation
  const { issues: txnIssues, summary } = validateTransactions(content, fileId, fileName);
  issues.push(...txnIssues);

  // Forward balance validation
  const { issues: fwdBalIssues } = parseForwardBalances(content, fileId, fileName);
  issues.push(...fwdBalIssues);

  // Parse statements for balance/arithmetic validation
  const parsedStatements = parseStatementBlocks(content);

  for (let i = 0; i < parsedStatements.length; i++) {
    const ps = parsedStatements[i];
    const currency = ps.openingBalance?.currency || ps.closingBalance?.currency || 'EUR';

    // Balance validation (presence and consistency)
    const balanceResult = validateStatementBalances(
      ps.openingBalance,
      ps.closingBalance,
      ps.availableBalance,
      i
    );
    for (const issue of balanceResult.issues) {
      issues.push({ ...issue, fileId, fileName });
    }

    // Arithmetic validation (if we have both balances)
    if (ps.openingBalance && ps.closingBalance) {
      // Use statement-specific transactions, not all file transactions
      const stmtTxns = ps.transactions.map((t, idx) => convertTransaction(t, currency, idx));
      const arithmeticResult = validateArithmetic(
        ps.openingBalance,
        ps.closingBalance,
        stmtTxns,
        i
      );
      for (const issue of arithmeticResult.issues) {
        issues.push({ ...issue, fileId, fileName });
      }

      // Build Statement object for continuity validation later
      statements.push({
        id: `${fileId}-stmt-${i}`,
        fileId,
        accountId: ps.accountId,
        statementNumber: ps.statementNumber,
        sequenceNumber: ps.sequenceNumber,
        openingBalance: ps.openingBalance,
        closingBalance: ps.closingBalance,
        transactions: stmtTxns,
      });
    }
  }

  return {
    fileId,
    fileName,
    issues,
    transactionCount: summary.count,
    hasStructuralErrors,
    statements,
  };
}

export { validateStructure } from './structural';
export { validateTransactions } from './transaction';
export { parseForwardBalances, applyReversalLogic } from './forwardBalance';
export {
  detectDuplicateFiles,
  detectDuplicateStatements,
  detectDuplicateTransactions,
  detectAllDuplicates,
} from './duplicates';
export { validateStatementBalances, validateCurrencyConsistency } from './balance';
export { validateArithmetic, getSignedBalance } from './arithmetic';
export { validateContinuity, groupStatements, sortStatements } from './continuity';
