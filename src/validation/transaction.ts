import Decimal from 'decimal.js';
import type { ValidationIssue } from '../types/validation';

export interface ParsedTransaction {
  lineNumber: number;
  valueDate: string;
  entryDate?: string;
  isCredit: boolean;
  isReversal: boolean;
  effectiveIsCredit: boolean;
  amount: Decimal;
  transactionType: string;
  reference: string;
  narrative?: string;
  narrativeLineNumber?: number;
}

export interface TransactionSummary {
  count: number;
  creditCount: number;
  debitCount: number;
  creditSum: Decimal;
  debitSum: Decimal;
  netSum: Decimal;
}

interface TagLine {
  tag: string;
  content: string;
  lineNumber: number;
}

function parseLines(content: string): TagLine[] {
  const result: TagLine[] = [];
  const lines = content.split('\n');
  let currentTag = '';
  let currentContent = '';
  let currentLineNumber = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const tagMatch = line.match(/^:(\d{2}[A-Z]?):(.*)/);

    if (tagMatch) {
      if (currentTag) {
        result.push({ tag: currentTag, content: currentContent, lineNumber: currentLineNumber });
      }
      currentTag = `:${tagMatch[1]}:`;
      currentContent = tagMatch[2];
      currentLineNumber = i + 1;
    } else if (currentTag && line.trim()) {
      currentContent += '\n' + line;
    }
  }

  if (currentTag) {
    result.push({ tag: currentTag, content: currentContent, lineNumber: currentLineNumber });
  }

  return result;
}

function parseDate(dateStr: string): { valid: boolean; date?: string } {
  if (dateStr.length !== 6) return { valid: false };

  const yy = dateStr.slice(0, 2);
  const mm = dateStr.slice(2, 4);
  const dd = dateStr.slice(4, 6);

  const month = parseInt(mm, 10);
  const day = parseInt(dd, 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { valid: false };
  }

  const year = parseInt(yy, 10) > 50 ? `19${yy}` : `20${yy}`;
  return { valid: true, date: `${year}-${mm}-${dd}` };
}

function parseAmount(amountStr: string): Decimal | null {
  const cleaned = amountStr.replace(',', '.');
  try {
    return new Decimal(cleaned);
  } catch {
    return null;
  }
}

export function parse61Line(content: string): {
  valueDate?: string;
  entryDate?: string;
  isCredit?: boolean;
  isReversal: boolean;
  amount?: Decimal;
  transactionType?: string;
  reference?: string;
  errors: string[];
} {
  const errors: string[] = [];

  // :61: format: YYMMDD[MMDD]DC[amount][type][reference]
  // Minimum: 6 chars date + 1 char D/C + some amount
  if (content.length < 10) {
    errors.push('Line too short');
    return { errors };
  }

  const valueDateStr = content.slice(0, 6);
  const valueDateResult = parseDate(valueDateStr);
  if (!valueDateResult.valid) {
    errors.push('Invalid value date');
  }

  let pos = 6;
  let entryDate: string | undefined;

  // Check for optional entry date (4 chars: MMDD)
  const possibleEntryDate = content.slice(6, 10);
  if (/^\d{4}$/.test(possibleEntryDate)) {
    const entryMM = possibleEntryDate.slice(0, 2);
    const entryDD = possibleEntryDate.slice(2, 4);
    const month = parseInt(entryMM, 10);
    const day = parseInt(entryDD, 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const year = valueDateResult.date?.slice(0, 4) || '20' + valueDateStr.slice(0, 2);
      entryDate = `${year}-${entryMM}-${entryDD}`;
      pos = 10;
    }
  }

  // D/C marker (C, D, RC, RD)
  let isCredit: boolean | undefined;
  let isReversal = false;
  const dcMatch = content.slice(pos).match(/^(R?[CD])/);
  if (dcMatch) {
    const marker = dcMatch[1];
    isReversal = marker.startsWith('R');
    isCredit = marker.endsWith('C');
    pos += marker.length;
  } else {
    errors.push('Missing or invalid D/C marker');
  }

  // Amount (digits with optional comma/decimal)
  const amountMatch = content.slice(pos).match(/^(\d+[,.]?\d*)/);
  let amount: Decimal | undefined;
  if (amountMatch) {
    const parsed = parseAmount(amountMatch[1]);
    if (parsed) {
      amount = parsed;
      pos += amountMatch[1].length;
    } else {
      errors.push('Invalid amount');
    }
  } else {
    errors.push('Missing amount');
  }

  // Transaction type (1 letter + 3 chars)
  const typeMatch = content.slice(pos).match(/^([A-Z]\d{3}|[A-Z]{4})/);
  let transactionType: string | undefined;
  if (typeMatch) {
    transactionType = typeMatch[1];
    pos += typeMatch[1].length;
  }

  // Reference (rest of line)
  const reference = content.slice(pos).trim();

  return {
    valueDate: valueDateResult.date,
    entryDate,
    isCredit,
    isReversal,
    amount,
    transactionType,
    reference,
    errors,
  };
}

export function validateTransactions(
  content: string,
  fileId?: string,
  fileName?: string
): { issues: ValidationIssue[]; transactions: ParsedTransaction[]; summary: TransactionSummary } {
  const issues: ValidationIssue[] = [];
  const transactions: ParsedTransaction[] = [];
  const tagLines = parseLines(content);

  let creditSum = new Decimal(0);
  let debitSum = new Decimal(0);
  let creditCount = 0;
  let debitCount = 0;

  for (let i = 0; i < tagLines.length; i++) {
    const { tag, content: tagContent, lineNumber } = tagLines[i];

    if (tag === ':61:') {
      const parsed = parse61Line(tagContent);

      for (const error of parsed.errors) {
        issues.push({
          severity: 'error',
          code: 'TXN_MALFORMED_61',
          message: `Malformed :61: line: ${error}`,
          fileId,
          fileName,
          lineNumber,
        });
      }

      if (parsed.amount && parsed.isCredit !== undefined) {
        // Reversals flip the effective sign: RC = debit effect, RD = credit effect
        const effectiveCredit = parsed.isReversal ? !parsed.isCredit : parsed.isCredit;

        const txn: ParsedTransaction = {
          lineNumber,
          valueDate: parsed.valueDate || '',
          entryDate: parsed.entryDate,
          isCredit: parsed.isCredit,
          isReversal: parsed.isReversal,
          effectiveIsCredit: effectiveCredit,
          amount: parsed.amount,
          transactionType: parsed.transactionType || '',
          reference: parsed.reference || '',
        };

        // Look for following :86:
        if (i + 1 < tagLines.length && tagLines[i + 1].tag === ':86:') {
          txn.narrative = tagLines[i + 1].content;
          txn.narrativeLineNumber = tagLines[i + 1].lineNumber;
        }

        transactions.push(txn);
        if (effectiveCredit) {
          creditSum = creditSum.plus(parsed.amount);
          creditCount++;
        } else {
          debitSum = debitSum.plus(parsed.amount);
          debitCount++;
        }
      }
    }
  }

  const summary: TransactionSummary = {
    count: transactions.length,
    creditCount,
    debitCount,
    creditSum,
    debitSum,
    netSum: creditSum.minus(debitSum),
  };

  return { issues, transactions, summary };
}
