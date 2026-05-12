import type { ValidationIssue, Statement } from '../types/validation';
import { getSignedBalance } from './arithmetic';

export interface StatementGroup {
  accountId: string;
  currency: string;
  statements: Statement[];
}

export interface ContinuityValidationResult {
  groups: StatementGroup[];
  issues: ValidationIssue[];
  multipleAccounts: boolean;
}

function createIssue(
  severity: ValidationIssue['severity'],
  code: string,
  message: string,
  statementIndex?: number
): ValidationIssue {
  return { severity, code, message, field: 'continuity', statementIndex };
}

export function groupStatements(statements: Statement[]): StatementGroup[] {
  const groups = new Map<string, StatementGroup>();

  for (const stmt of statements) {
    const key = `${stmt.accountId}:${stmt.openingBalance.currency}`;
    if (!groups.has(key)) {
      groups.set(key, {
        accountId: stmt.accountId,
        currency: stmt.openingBalance.currency,
        statements: [],
      });
    }
    groups.get(key)!.statements.push(stmt);
  }

  return Array.from(groups.values());
}

export function sortStatements(statements: Statement[]): Statement[] {
  return [...statements].sort((a, b) => {
    const dateA = a.openingBalance.date;
    const dateB = b.openingBalance.date;
    if (dateA !== dateB) return dateA.localeCompare(dateB);

    const numA = parseInt(a.statementNumber, 10) || 0;
    const numB = parseInt(b.statementNumber, 10) || 0;
    return numA - numB;
  });
}

export function detectDuplicateStatementNumbers(statements: Statement[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Map<string, number>();

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const key = stmt.statementNumber;

    if (seen.has(key)) {
      issues.push(createIssue(
        'error',
        'DUPLICATE_STATEMENT_NUMBER',
        `Duplicate statement number: ${key} (appears at indices ${seen.get(key)} and ${i})`,
        i
      ));
    } else {
      seen.set(key, i);
    }
  }

  return issues;
}

export function detectOutOfOrder(statements: Statement[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (let i = 1; i < statements.length; i++) {
    const prev = statements[i - 1];
    const curr = statements[i];

    const prevDate = prev.closingBalance.date;
    const currDate = curr.openingBalance.date;

    if (currDate < prevDate) {
      issues.push(createIssue(
        'warning',
        'OUT_OF_ORDER_STATEMENTS',
        `Statement ${curr.statementNumber} (${currDate}) appears before previous statement's closing date (${prevDate})`,
        i
      ));
    }
  }

  return issues;
}

export function validateBalanceContinuity(statements: Statement[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (let i = 1; i < statements.length; i++) {
    const prev = statements[i - 1];
    const curr = statements[i];

    const prevClosing = getSignedBalance(prev.closingBalance);
    const currOpening = getSignedBalance(curr.openingBalance);

    if (!prevClosing.equals(currOpening)) {
      issues.push(createIssue(
        'error',
        'BALANCE_DISCONTINUITY',
        `Balance discontinuity: statement ${prev.statementNumber} closes at ${prevClosing.toFixed(2)}, ` +
        `but statement ${curr.statementNumber} opens at ${currOpening.toFixed(2)}`,
        i
      ));
    }
  }

  return issues;
}

export function validateContinuity(statements: Statement[]): ContinuityValidationResult {
  const issues: ValidationIssue[] = [];
  const groups = groupStatements(statements);
  const multipleAccounts = groups.length > 1;

  if (multipleAccounts) {
    const uniqueAccountIds = new Set(groups.map(g => g.accountId));
    const showCurrency = uniqueAccountIds.size < groups.length;
    const accounts = groups.map(g =>
      showCurrency ? `${g.accountId} (${g.currency})` : g.accountId
    ).join(', ');
    issues.push(createIssue(
      'warning',
      'MULTIPLE_ACCOUNTS',
      `Multiple accounts detected: ${accounts}. Merge will create separate output files.`
    ));
  }

  for (const group of groups) {
    const sorted = sortStatements(group.statements);
    group.statements = sorted;

    issues.push(...detectDuplicateStatementNumbers(sorted));
    issues.push(...detectOutOfOrder(sorted));
    issues.push(...validateBalanceContinuity(sorted));
  }

  return { groups, issues, multipleAccounts };
}
