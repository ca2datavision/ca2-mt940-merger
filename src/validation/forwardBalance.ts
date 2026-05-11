import Decimal from 'decimal.js';
import type { ValidationIssue } from '../types/validation';

export interface ForwardBalance {
  lineNumber: number;
  date: string;
  currency: string;
  amount: Decimal;
  isCredit: boolean;
}

export interface ForwardBalanceResult {
  balances: ForwardBalance[];
  issues: ValidationIssue[];
}

function parseBalanceLine(content: string): {
  date?: string;
  currency?: string;
  amount?: Decimal;
  isCredit?: boolean;
  error?: string;
} {
  // Balance format: C/DYYMMDDCURRENCYAMOUNT
  // Example: C230115EUR1500,00
  if (content.length < 14) {
    return { error: 'Balance line too short' };
  }

  const dcMarker = content[0];
  if (dcMarker !== 'C' && dcMarker !== 'D') {
    return { error: 'Invalid C/D marker' };
  }

  const dateStr = content.slice(1, 7);
  const yy = dateStr.slice(0, 2);
  const mm = dateStr.slice(2, 4);
  const dd = dateStr.slice(4, 6);

  const month = parseInt(mm, 10);
  const day = parseInt(dd, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { error: 'Invalid date' };
  }

  const year = parseInt(yy, 10) > 50 ? `19${yy}` : `20${yy}`;
  const date = `${year}-${mm}-${dd}`;

  const currency = content.slice(7, 10);
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { error: 'Invalid currency code' };
  }

  const amountStr = content.slice(10).replace(',', '.');
  let amount: Decimal;
  try {
    amount = new Decimal(amountStr);
  } catch {
    return { error: 'Invalid amount' };
  }

  return {
    date,
    currency,
    amount,
    isCredit: dcMarker === 'C',
  };
}

export function parseForwardBalances(
  content: string,
  fileId?: string,
  fileName?: string
): ForwardBalanceResult {
  const balances: ForwardBalance[] = [];
  const issues: ValidationIssue[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^:65:(.*)/);
    if (match) {
      const lineNumber = i + 1;
      const parsed = parseBalanceLine(match[1]);

      if (parsed.error) {
        issues.push({
          severity: 'error',
          code: 'BAL_MALFORMED_65',
          message: `Malformed :65: forward balance: ${parsed.error}`,
          fileId,
          fileName,
          lineNumber,
        });
      } else if (parsed.date && parsed.currency && parsed.amount) {
        balances.push({
          lineNumber,
          date: parsed.date,
          currency: parsed.currency,
          amount: parsed.amount,
          isCredit: parsed.isCredit!,
        });
      }
    }
  }

  return { balances, issues };
}

export interface ReversalInfo {
  isReversal: boolean;
  signedAmount: Decimal;
}

export function applyReversalLogic(
  amount: Decimal,
  isCredit: boolean,
  isReversal: boolean
): Decimal {
  // Reversals flip the sign:
  // RC (reversal credit) = negative credit = debit effect
  // RD (reversal debit) = negative debit = credit effect
  const sign = isCredit ? 1 : -1;
  const reversalMultiplier = isReversal ? -1 : 1;
  return amount.times(sign * reversalMultiplier);
}
