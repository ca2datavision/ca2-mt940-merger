/**
 * Domain Model Types for MT940 Validation
 * Decoupled from mt940-js library internals.
 */

import type { Decimal } from 'decimal.js';

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  severity: IssueSeverity;
  code: string;
  message: string;
  fileId?: string;
  fileName?: string;
  statementIndex?: number;
  transactionIndex?: number;
  field?: string;
  lineNumber?: number;
  suggestion?: string;
}

export interface Balance {
  date: string;
  amount: Decimal;
  currency: string;
  isCredit: boolean;
}

export interface Transaction {
  id: string;
  fingerprint: string;
  entryDate: string;
  valueDate: string;
  amount: Decimal;
  currency: string;
  isCredit: boolean;
  transactionType: string;
  customerReference: string;
  bankReference: string;
  description: string;
  extraDetails?: {
    name?: string;
    address?: string;
    account?: string;
    bankName?: string;
    fiscalCode?: string;
  };
}

export interface Statement {
  id: string;
  fileId: string;
  accountId: string;
  statementNumber: string;
  sequenceNumber: string;
  openingBalance: Balance;
  closingBalance: Balance;
  transactions: Transaction[];
}

export interface InputFile {
  id: string;
  name: string;
  hash: string;
  size: number;
  encoding: string;
  statementCount: number;
  transactionCount: number;
}

export interface BatchSummary {
  totalFiles: number;
  totalStatements: number;
  totalTransactions: number;
  uniqueTransactions: number;
  duplicateTransactions: number;
  accounts: string[];
  dateRange: {
    earliest: string;
    latest: string;
  };
  currencies: string[];
}

export interface MergeEligibility {
  eligible: boolean;
  reason?: string;
  blockers: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationResult {
  batchSummary: BatchSummary;
  inputFiles: InputFile[];
  parsedStatements: Statement[];
  issues: ValidationIssue[];
  mergeEligibility: MergeEligibility;
  validatedAt: string;
}
