import type { ValidationIssue } from '../types/validation';
import { validateStructure } from './structural';
import { validateTransactions } from './transaction';
import { parseForwardBalances } from './forwardBalance';

export interface FileValidationResult {
  fileId: string;
  fileName: string;
  issues: ValidationIssue[];
  transactionCount: number;
  hasStructuralErrors: boolean;
}

export function validateFileContent(
  content: string,
  fileId: string,
  fileName: string
): FileValidationResult {
  const issues: ValidationIssue[] = [];

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

  return {
    fileId,
    fileName,
    issues,
    transactionCount: summary.count,
    hasStructuralErrors,
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
