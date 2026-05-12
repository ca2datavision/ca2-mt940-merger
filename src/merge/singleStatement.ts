import type { Statement, Transaction, Balance } from '../types/validation';
import { analyzeMergeEligibility } from '../validation/merge';

export interface MergedStatement {
  accountId: string;
  statementNumber: string;
  sequenceNumber: string;
  openingBalance: Balance;
  closingBalance: Balance;
  transactions: Transaction[];
  sourceStatementIds: string[];
}

export interface MergePreview {
  eligible: boolean;
  reason: string;
  merged?: MergedStatement;
  transactionCount: number;
  dateRange: { start: string; end: string };
}

export function previewSingleStatementMerge(
  statements: Statement[],
  issues: { severity: string }[] = []
): MergePreview {
  const analysis = analyzeMergeEligibility(statements, issues as never);

  if (!analysis.singleStatement.eligible) {
    return {
      eligible: false,
      reason: analysis.singleStatement.reason || 'Merge not possible',
      transactionCount: 0,
      dateRange: { start: '', end: '' },
    };
  }

  const merged = mergeSingleStatement(statements);

  return {
    eligible: true,
    reason: 'Ready for merge',
    merged,
    transactionCount: merged.transactions.length,
    dateRange: {
      start: merged.openingBalance.date,
      end: merged.closingBalance.date,
    },
  };
}

export function mergeSingleStatement(statements: Statement[]): MergedStatement {
  if (statements.length === 0) {
    throw new Error('No statements to merge');
  }

  if (statements.length === 1) {
    const stmt = statements[0];
    const recalculated = recalculateClosingBalance(stmt.openingBalance, stmt.transactions);
    return {
      accountId: stmt.accountId,
      statementNumber: stmt.statementNumber,
      sequenceNumber: stmt.sequenceNumber,
      openingBalance: { ...stmt.openingBalance },
      closingBalance: recalculated,
      transactions: [...stmt.transactions],
      sourceStatementIds: [stmt.id],
    };
  }

  const sorted = [...statements].sort((a, b) =>
    a.openingBalance.date.localeCompare(b.openingBalance.date)
  );

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const allTransactions: Transaction[] = [];
  for (const stmt of sorted) {
    allTransactions.push(...stmt.transactions);
  }

  allTransactions.sort((a, b) => {
    const dateCompare = a.entryDate.localeCompare(b.entryDate);
    if (dateCompare !== 0) return dateCompare;
    return a.valueDate.localeCompare(b.valueDate);
  });

  const recalculatedClosing = recalculateClosingBalance(
    first.openingBalance,
    allTransactions
  );

  return {
    accountId: first.accountId,
    statementNumber: `${first.statementNumber}-${last.statementNumber}`,
    sequenceNumber: '1',
    openingBalance: { ...first.openingBalance },
    closingBalance: recalculatedClosing,
    transactions: allTransactions,
    sourceStatementIds: sorted.map(s => s.id),
  };
}

function recalculateClosingBalance(
  opening: Balance,
  transactions: Transaction[]
): Balance {
  let balance = opening.amount;

  for (const txn of transactions) {
    if (txn.isCredit) {
      balance = balance.plus(txn.amount);
    } else {
      balance = balance.minus(txn.amount);
    }
  }

  const lastTxn = transactions[transactions.length - 1];
  const closingDate = lastTxn?.entryDate || opening.date;

  return {
    date: closingDate,
    amount: balance.abs(),
    currency: opening.currency,
    isCredit: balance.greaterThanOrEqualTo(0),
  };
}

export function validateMergeResult(
  original: Statement[],
  merged: MergedStatement
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  const originalTxnCount = original.reduce((sum, s) => sum + s.transactions.length, 0);
  if (merged.transactions.length !== originalTxnCount) {
    issues.push(`Transaction count mismatch: expected ${originalTxnCount}, got ${merged.transactions.length}`);
  }

  const sorted = [...original].sort((a, b) =>
    a.openingBalance.date.localeCompare(b.openingBalance.date)
  );
  const expectedOpening = sorted[0].openingBalance;

  if (!merged.openingBalance.amount.equals(expectedOpening.amount)) {
    issues.push(`Opening balance mismatch`);
  }

  return { valid: issues.length === 0, issues };
}
