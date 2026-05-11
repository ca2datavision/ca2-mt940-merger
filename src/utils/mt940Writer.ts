/**
 * MT940 Writer Prototype
 * Generates MT940 format text from parsed statement data.
 *
 * MT940 Format Tags:
 * :20: Transaction Reference Number
 * :25: Account Identification
 * :28C: Statement Number/Sequence
 * :60F: Opening Balance (F=First, M=Intermediate)
 * :61: Statement Line (transaction)
 * :86: Information to Account Owner
 * :62F: Closing Balance (F=Final, M=Intermediate)
 */

import type {
  MT940ParsedData,
  MT940Statement as MT940ParsedStatement,
  MT940Transaction as MT940ParsedTransaction
} from '../types/mt940';

export interface MT940Transaction {
  entryDate?: string;
  valueDate?: string;
  amount?: string;
  currency?: string;
  transactionType?: string;
  description?: string;
  reference?: string;
  bankReference?: string;
  extraDetails?: {
    name?: string;
    address?: string;
    account?: string;
    bankName?: string;
    fiscalCode?: string;
  };
}

export interface MT940Statement {
  accountId?: string;
  statementNumber?: string;
  sequenceNumber?: string;
  openingBalance?: {
    date?: string;
    amount?: string;
    currency?: string;
    isCredit?: boolean;
  };
  closingBalance?: {
    date?: string;
    amount?: string;
    currency?: string;
    isCredit?: boolean;
  };
  transactions?: MT940Transaction[];
}

export interface MT940WriteOptions {
  referenceNumber?: string;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '000000';
  const clean = dateStr.replace(/-/g, '');
  return clean.length >= 8 ? clean.slice(2, 8) : clean.padEnd(6, '0');
}

function formatAmount(amount: string | undefined): string {
  if (!amount) return '0,00';
  const num = parseFloat(amount.replace(',', '.'));
  const absNum = Math.abs(num);
  return absNum.toFixed(2).replace('.', ',');
}

function isDebit(amount: string | undefined): boolean {
  if (!amount) return false;
  const num = parseFloat(amount.replace(',', '.'));
  return num < 0;
}

function formatBalanceLine(
  tag: string,
  balance: MT940Statement['openingBalance']
): string {
  if (!balance) return '';
  const dcMark = balance.isCredit !== false ? 'C' : 'D';
  const date = formatDate(balance.date);
  const currency = balance.currency || 'EUR';
  const amount = formatAmount(balance.amount);
  return `:${tag}:${dcMark}${date}${currency}${amount}`;
}

function formatTransactionLine(tx: MT940Transaction): string {
  const valueDate = formatDate(tx.valueDate || tx.entryDate);
  const entryDate = formatDate(tx.entryDate)?.slice(2, 6) || '';
  const dcMark = isDebit(tx.amount) ? 'D' : 'C';
  const amount = formatAmount(tx.amount);
  const txType = (tx.transactionType || 'NTRF').slice(0, 4).padEnd(4, ' ');
  const ref = (tx.reference || 'NONREF').slice(0, 16);

  return `:61:${valueDate}${entryDate}${dcMark}${amount}${txType}${ref}`;
}

function formatInfoLine(tx: MT940Transaction): string {
  const parts: string[] = [];

  if (tx.description) {
    parts.push(tx.description);
  }
  if (tx.extraDetails?.name) {
    parts.push(tx.extraDetails.name);
  }
  if (tx.extraDetails?.account) {
    parts.push(tx.extraDetails.account);
  }

  const info = parts.join(' ').slice(0, 390);
  return info ? `:86:${info}` : '';
}

export function writeMT940(
  statements: MT940Statement[],
  options: MT940WriteOptions = {}
): string {
  const lines: string[] = [];

  for (const stmt of statements) {
    const refNum = options.referenceNumber || 'STARTUMS';
    lines.push(`:20:${refNum}`);
    lines.push(`:25:${stmt.accountId || 'UNKNOWN'}`);

    const stmtNum = stmt.statementNumber || '1';
    const seqNum = stmt.sequenceNumber || '1';
    lines.push(`:28C:${stmtNum}/${seqNum}`);

    if (stmt.openingBalance) {
      lines.push(formatBalanceLine('60F', stmt.openingBalance));
    }

    for (const tx of stmt.transactions || []) {
      lines.push(formatTransactionLine(tx));
      const infoLine = formatInfoLine(tx);
      if (infoLine) {
        lines.push(infoLine);
      }
    }

    if (stmt.closingBalance) {
      lines.push(formatBalanceLine('62F', stmt.closingBalance));
    }

    lines.push('-');
  }

  return lines.join('\r\n');
}

export function convertParsedToWritable(parsed: MT940ParsedData): MT940Statement[] {
  if (!parsed?.statements) return [];

  return parsed.statements.map((stmt: MT940ParsedStatement) => ({
    accountId: stmt.accountId,
    statementNumber: stmt.number || '1',
    sequenceNumber: '1',
    openingBalance: stmt.openingBalance ? {
      date: stmt.openingBalance.date,
      amount: String(stmt.openingBalance.value || 0),
      currency: stmt.openingBalance.currency || 'EUR',
      isCredit: stmt.openingBalance.isCredit !== false
    } : undefined,
    closingBalance: stmt.closingBalance ? {
      date: stmt.closingBalance.date,
      amount: String(stmt.closingBalance.value || 0),
      currency: stmt.closingBalance.currency || 'EUR',
      isCredit: stmt.closingBalance.isCredit !== false
    } : undefined,
    transactions: (stmt.transactions || []).map((tx: MT940ParsedTransaction) => ({
      entryDate: tx.entryDate,
      valueDate: tx.valueDate || tx.entryDate,
      amount: String(tx.amount || 0),
      currency: tx.currency,
      transactionType: tx.code,
      description: tx.description,
      reference: tx.customerReference || 'NONREF',
      extraDetails: tx.extraDetails
    }))
  }));
}
