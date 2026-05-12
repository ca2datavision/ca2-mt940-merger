import type { Statement, ValidationIssue, MergeEligibility } from '../types/validation';

export interface MergeAnalysisResult {
  multiMessage: MergeEligibility;
  singleStatement: MergeEligibility;
}

export function analyzeMergeEligibility(
  statements: Statement[],
  issues: ValidationIssue[]
): MergeAnalysisResult {
  const multiMessage = analyzeMultiMessageMerge(statements, issues);
  const singleStatement = analyzeSingleStatementMerge(statements, issues);

  return { multiMessage, singleStatement };
}

function analyzeMultiMessageMerge(
  statements: Statement[],
  issues: ValidationIssue[]
): MergeEligibility {
  const blockers: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (statements.length === 0) {
    blockers.push({
      severity: 'error',
      code: 'MERGE_NO_STATEMENTS',
      message: 'No statements available for merge',
    });
    return { eligible: false, reason: 'No statements to merge', blockers, warnings };
  }

  const errors = issues.filter(i => i.severity === 'error');
  if (errors.length > 0) {
    blockers.push({
      severity: 'error',
      code: 'MERGE_VALIDATION_ERRORS',
      message: `${errors.length} validation error(s) must be resolved`,
    });
  }

  warnings.push(...issues.filter(i => i.severity === 'warning'));

  const eligible = blockers.length === 0;
  return {
    eligible,
    reason: eligible ? 'All files valid' : 'Validation errors present',
    blockers,
    warnings,
  };
}

function analyzeSingleStatementMerge(
  statements: Statement[],
  issues: ValidationIssue[]
): MergeEligibility {
  const blockers: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (statements.length === 0) {
    blockers.push({
      severity: 'error',
      code: 'MERGE_NO_STATEMENTS',
      message: 'No statements available for merge',
    });
    return { eligible: false, reason: 'No statements to merge', blockers, warnings };
  }

  if (statements.length === 1) {
    return {
      eligible: true,
      reason: 'Single statement - no merge needed',
      blockers: [],
      warnings: [],
    };
  }

  const errors = issues.filter(i => i.severity === 'error');
  if (errors.length > 0) {
    blockers.push({
      severity: 'error',
      code: 'MERGE_VALIDATION_ERRORS',
      message: `${errors.length} validation error(s) must be resolved`,
    });
  }

  const accounts = new Set(statements.map(s => s.accountId));
  if (accounts.size > 1) {
    blockers.push({
      severity: 'error',
      code: 'MERGE_MULTIPLE_ACCOUNTS',
      message: `Cannot merge statements from ${accounts.size} different accounts`,
    });
  }

  const currencies = new Set(statements.map(s => s.openingBalance.currency));
  if (currencies.size > 1) {
    blockers.push({
      severity: 'error',
      code: 'MERGE_MULTIPLE_CURRENCIES',
      message: `Cannot merge statements with ${currencies.size} different currencies`,
    });
  }

  const sorted = [...statements].sort((a, b) =>
    a.openingBalance.date.localeCompare(b.openingBalance.date)
  );

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    const prevClosing = prev.closingBalance;
    const currOpening = curr.openingBalance;

    if (!prevClosing.amount.equals(currOpening.amount)) {
      blockers.push({
        severity: 'error',
        code: 'MERGE_BALANCE_GAP',
        message: `Balance gap: statement ${prev.statementNumber} closes at ${prevClosing.amount} but ${curr.statementNumber} opens at ${currOpening.amount}`,
      });
    }

    if (prev.closingBalance.date > curr.openingBalance.date) {
      blockers.push({
        severity: 'error',
        code: 'MERGE_NOT_CHRONOLOGICAL',
        message: `Statements not chronological: ${prev.statementNumber} (${prev.closingBalance.date}) overlaps ${curr.statementNumber} (${curr.openingBalance.date})`,
      });
    }
  }

  warnings.push(...issues.filter(i => i.severity === 'warning'));

  const eligible = blockers.length === 0;
  return {
    eligible,
    reason: eligible
      ? 'Statements are continuous and compatible'
      : `${blockers.length} issue(s) prevent single-statement merge`,
    blockers,
    warnings,
  };
}
