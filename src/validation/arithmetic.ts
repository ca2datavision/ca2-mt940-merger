import Decimal from 'decimal.js';
import type { ValidationIssue, Balance, Transaction } from '../types/validation';

export interface ArithmeticBreakdown {
  opening: Decimal;
  totalDebits: Decimal;
  totalCredits: Decimal;
  netTransactions: Decimal;
  expectedClosing: Decimal;
  actualClosing: Decimal;
  difference: Decimal;
  isBalanced: boolean;
}

export interface ArithmeticValidationResult {
  breakdown: ArithmeticBreakdown;
  issues: ValidationIssue[];
}

function createIssue(
  severity: ValidationIssue['severity'],
  code: string,
  message: string,
  statementIndex?: number,
  suggestion?: string
): ValidationIssue {
  return { severity, code, message, field: 'arithmetic', statementIndex, suggestion };
}

export function calculateTransactionTotals(transactions: Transaction[]): {
  totalDebits: Decimal;
  totalCredits: Decimal;
  net: Decimal;
} {
  let totalDebits = new Decimal(0);
  let totalCredits = new Decimal(0);

  for (const tx of transactions) {
    if (tx.isCredit) {
      totalCredits = totalCredits.plus(tx.amount);
    } else {
      totalDebits = totalDebits.plus(tx.amount);
    }
  }

  const net = totalCredits.minus(totalDebits);
  return { totalDebits, totalCredits, net };
}

export function getSignedBalance(balance: Balance): Decimal {
  return balance.isCredit ? balance.amount : balance.amount.neg();
}

export function validateArithmetic(
  openingBalance: Balance,
  closingBalance: Balance,
  transactions: Transaction[],
  statementIndex?: number
): ArithmeticValidationResult {
  const issues: ValidationIssue[] = [];

  const opening = getSignedBalance(openingBalance);
  const actualClosing = getSignedBalance(closingBalance);

  const { totalDebits, totalCredits, net } = calculateTransactionTotals(transactions);
  const expectedClosing = opening.plus(net);

  const difference = actualClosing.minus(expectedClosing);
  const isBalanced = difference.isZero();

  const breakdown: ArithmeticBreakdown = {
    opening,
    totalDebits,
    totalCredits,
    netTransactions: net,
    expectedClosing,
    actualClosing,
    difference,
    isBalanced,
  };

  if (!isBalanced) {
    const message = [
      `Arithmetic mismatch in statement:`,
      `  Opening: ${opening.toFixed(2)}`,
      `  Debits: -${totalDebits.toFixed(2)}`,
      `  Credits: +${totalCredits.toFixed(2)}`,
      `  Net: ${net.toFixed(2)}`,
      `  Expected closing: ${expectedClosing.toFixed(2)}`,
      `  Actual closing: ${actualClosing.toFixed(2)}`,
      `  Difference: ${difference.toFixed(2)}`,
    ].join('\n');

    issues.push(createIssue('error', 'ARITHMETIC_MISMATCH', message, statementIndex, 'Verify that all transactions are included and amounts are correct. Check for missing or duplicate entries.'));
  }

  return { breakdown, issues };
}

export function formatBreakdown(breakdown: ArithmeticBreakdown): string {
  return [
    `Opening balance: ${breakdown.opening.toFixed(2)}`,
    `Total debits: -${breakdown.totalDebits.toFixed(2)}`,
    `Total credits: +${breakdown.totalCredits.toFixed(2)}`,
    `Net transactions: ${breakdown.netTransactions.toFixed(2)}`,
    `Expected closing: ${breakdown.expectedClosing.toFixed(2)}`,
    `Actual closing: ${breakdown.actualClosing.toFixed(2)}`,
    breakdown.isBalanced
      ? 'Status: BALANCED ✓'
      : `Status: MISMATCH (difference: ${breakdown.difference.toFixed(2)})`,
  ].join('\n');
}
