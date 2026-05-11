import Decimal from 'decimal.js';
import type { ValidationIssue, Balance } from '../types/validation';

const DATE_PATTERN = /^\d{6}$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const AMOUNT_PATTERN = /^\d+,\d{2}$/;

export interface RawBalance {
  tag: string;
  creditDebit: string;
  date: string;
  currency: string;
  amount: string;
}

export interface BalanceValidationResult {
  balance?: Balance;
  issues: ValidationIssue[];
}

export interface StatementBalanceValidationResult {
  issues: ValidationIssue[];
}

function createIssue(
  severity: ValidationIssue['severity'],
  code: string,
  message: string,
  field?: string,
  statementIndex?: number
): ValidationIssue {
  return { severity, code, message, field, statementIndex };
}

export function parseBalanceTag(raw: string): RawBalance | null {
  const match = raw.match(/^:(\d{2}[FM]?):([CD])(\d{6})([A-Z]{3})(\d+,\d{2})$/);
  if (!match) return null;

  return {
    tag: match[1],
    creditDebit: match[2],
    date: match[3],
    currency: match[4],
    amount: match[5],
  };
}

export function validateDate(date: string, field: string, statementIndex?: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!DATE_PATTERN.test(date)) {
    issues.push(createIssue('error', 'INVALID_DATE_FORMAT', `Invalid date format: ${date} (expected YYMMDD)`, field, statementIndex));
    return issues;
  }

  const month = parseInt(date.slice(2, 4), 10);
  const day = parseInt(date.slice(4, 6), 10);

  if (month < 1 || month > 12) {
    issues.push(createIssue('error', 'INVALID_MONTH', `Invalid month: ${month}`, field, statementIndex));
  }

  if (day < 1 || day > 31) {
    issues.push(createIssue('error', 'INVALID_DAY', `Invalid day: ${day}`, field, statementIndex));
  }

  return issues;
}

export function validateCurrency(currency: string, field: string, statementIndex?: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!CURRENCY_PATTERN.test(currency)) {
    issues.push(createIssue('error', 'INVALID_CURRENCY', `Invalid currency: ${currency} (expected 3 uppercase letters)`, field, statementIndex));
  }

  return issues;
}

export function validateAmount(amount: string, field: string, statementIndex?: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!AMOUNT_PATTERN.test(amount)) {
    issues.push(createIssue('error', 'INVALID_AMOUNT_FORMAT', `Invalid amount format: ${amount} (expected comma decimal)`, field, statementIndex));
  }

  return issues;
}

export function parseAmount(amount: string): Decimal {
  const normalized = amount.replace(',', '.');
  return new Decimal(normalized);
}

export function convertDateToISO(yymmdd: string): string {
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  const century = yy >= 80 ? '19' : '20';
  return `${century}${yymmdd.slice(0, 2)}-${mm}-${dd}`;
}

export function validateRawBalance(raw: RawBalance, field: string, statementIndex?: number): BalanceValidationResult {
  const issues: ValidationIssue[] = [];

  issues.push(...validateDate(raw.date, field, statementIndex));
  issues.push(...validateCurrency(raw.currency, field, statementIndex));
  issues.push(...validateAmount(raw.amount, field, statementIndex));

  if (issues.some(i => i.severity === 'error')) {
    return { issues };
  }

  const balance: Balance = {
    date: convertDateToISO(raw.date),
    amount: parseAmount(raw.amount),
    currency: raw.currency,
    isCredit: raw.creditDebit === 'C',
  };

  return { balance, issues };
}

export function validateCurrencyConsistency(
  openingBalance: Balance | undefined,
  closingBalance: Balance | undefined,
  availableBalance: Balance | undefined,
  statementIndex?: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const currencies: string[] = [];

  if (openingBalance) currencies.push(openingBalance.currency);
  if (closingBalance) currencies.push(closingBalance.currency);
  if (availableBalance) currencies.push(availableBalance.currency);

  const uniqueCurrencies = [...new Set(currencies)];
  if (uniqueCurrencies.length > 1) {
    issues.push(createIssue(
      'error',
      'CURRENCY_MISMATCH',
      `Currency mismatch in statement: ${uniqueCurrencies.join(', ')}`,
      'balance',
      statementIndex
    ));
  }

  return issues;
}

export function validateStatementBalances(
  openingBalance: Balance | undefined,
  closingBalance: Balance | undefined,
  availableBalance: Balance | undefined,
  statementIndex?: number
): StatementBalanceValidationResult {
  const issues: ValidationIssue[] = [];

  if (!openingBalance) {
    issues.push(createIssue('error', 'MISSING_OPENING_BALANCE', 'Missing opening balance (:60F: or :60M:)', 'openingBalance', statementIndex));
  }

  if (!closingBalance) {
    issues.push(createIssue('error', 'MISSING_CLOSING_BALANCE', 'Missing closing balance (:62F: or :62M:)', 'closingBalance', statementIndex));
  }

  issues.push(...validateCurrencyConsistency(openingBalance, closingBalance, availableBalance, statementIndex));

  return { issues };
}
