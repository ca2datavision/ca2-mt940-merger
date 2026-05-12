/**
 * MT940 Tag Decoder
 * Decodes MT940 tags into human-readable explanations with validation.
 */

import { decodeTransactionType, formatTransactionType, type DecodedTransactionType } from './transaction-types.js';

export type Severity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  severity: Severity;
  message: string;
  field?: string;
}

export interface DecodedTag {
  tag: string;
  tagName: string;
  rawValue: string;
  fields: Record<string, string | number | boolean | DecodedTransactionType | undefined>;
  humanDescription: string;
  issues: ValidationIssue[];
}

export interface DecodedBalance {
  isDebit: boolean;
  isReversal?: boolean;
  date: string;
  dateFormatted: string;
  currency: string;
  amount: string;
  amountNumeric: number;
}

export interface DecodedTransaction {
  valueDate: string;
  valueDateFormatted: string;
  entryDate?: string;
  entryDateFormatted?: string;
  isDebit: boolean;
  isReversal: boolean;
  fundsCode?: string;
  amount: string;
  amountNumeric: number;
  transactionType: DecodedTransactionType;
  customerReference: string;
  bankReference?: string;
  supplementary?: string;
}

const TAG_NAMES: Record<string, string> = {
  '20': 'Transaction Reference Number',
  '21': 'Related Reference',
  '25': 'Account Identification',
  '28C': 'Statement Number/Sequence',
  '60F': 'Opening Balance (First)',
  '60M': 'Opening Balance (Intermediate)',
  '61': 'Statement Line (Transaction)',
  '62F': 'Closing Balance (Final)',
  '62M': 'Closing Balance (Intermediate)',
  '64': 'Closing Available Balance',
  '65': 'Forward Available Balance',
  '86': 'Information to Account Owner',
};

function parseYYMMDD(dateStr: string): { date: string; formatted: string; valid: boolean } {
  if (dateStr.length !== 6) {
    return { date: dateStr, formatted: dateStr, valid: false };
  }

  const yy = dateStr.slice(0, 2);
  const mm = dateStr.slice(2, 4);
  const dd = dateStr.slice(4, 6);

  const year = parseInt(yy, 10);
  const fullYear = year > 50 ? 1900 + year : 2000 + year;
  const month = parseInt(mm, 10);
  const day = parseInt(dd, 10);

  const valid = month >= 1 && month <= 12 && day >= 1 && day <= 31;

  return {
    date: `${fullYear}-${mm}-${dd}`,
    formatted: `${fullYear}-${mm}-${dd}`,
    valid,
  };
}

function parseMMDD(dateStr: string, referenceYear: number): { date: string; formatted: string; valid: boolean } {
  if (dateStr.length !== 4) {
    return { date: dateStr, formatted: dateStr, valid: false };
  }

  const mm = dateStr.slice(0, 2);
  const dd = dateStr.slice(2, 4);
  const month = parseInt(mm, 10);
  const day = parseInt(dd, 10);
  const valid = month >= 1 && month <= 12 && day >= 1 && day <= 31;

  return {
    date: `${referenceYear}-${mm}-${dd}`,
    formatted: `${referenceYear}-${mm}-${dd}`,
    valid,
  };
}

function parseAmount(amountStr: string): { amount: string; numeric: number; valid: boolean } {
  const normalized = amountStr.replace(',', '.');
  const numeric = parseFloat(normalized);
  const valid = !isNaN(numeric);

  return {
    amount: amountStr,
    numeric: valid ? numeric : 0,
    valid,
  };
}

export function decodeTag20(value: string): DecodedTag {
  const issues: ValidationIssue[] = [];

  if (!value || value.length === 0) {
    issues.push({ severity: 'error', message: 'Transaction reference is empty', field: 'reference' });
  } else if (value.length > 16) {
    issues.push({ severity: 'warning', message: `Reference exceeds 16 characters (${value.length})`, field: 'reference' });
  }

  return {
    tag: '20',
    tagName: TAG_NAMES['20'],
    rawValue: value,
    fields: { reference: value },
    humanDescription: `Transaction Reference: ${value}`,
    issues,
  };
}

export function decodeTag21(value: string): DecodedTag {
  const issues: ValidationIssue[] = [];

  if (value.length > 16) {
    issues.push({ severity: 'warning', message: `Related reference exceeds 16 characters (${value.length})`, field: 'reference' });
  }

  return {
    tag: '21',
    tagName: TAG_NAMES['21'],
    rawValue: value,
    fields: { reference: value },
    humanDescription: `Related Reference: ${value}`,
    issues,
  };
}

export function decodeTag25(value: string): DecodedTag {
  const issues: ValidationIssue[] = [];

  let accountId = value;
  let bic: string | undefined;

  const bicMatch = value.match(/^([A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?)\s*(.+)$/);
  if (bicMatch) {
    bic = bicMatch[1];
    accountId = bicMatch[3] || '';
  }

  if (!accountId || accountId.length === 0) {
    issues.push({ severity: 'error', message: 'Account identification is empty', field: 'accountId' });
  } else if (accountId.length > 35) {
    issues.push({ severity: 'warning', message: `Account ID exceeds 35 characters`, field: 'accountId' });
  }

  const desc = bic
    ? `Account: ${accountId} (BIC: ${bic})`
    : `Account: ${accountId}`;

  return {
    tag: '25',
    tagName: TAG_NAMES['25'],
    rawValue: value,
    fields: { accountId, bic },
    humanDescription: desc,
    issues,
  };
}

export function decodeTag28C(value: string): DecodedTag {
  const issues: ValidationIssue[] = [];

  const match = value.match(/^(\d+)(?:\/(\d+))?$/);
  if (!match) {
    issues.push({ severity: 'error', message: `Invalid statement number format: ${value}`, field: 'statementNumber' });
    return {
      tag: '28C',
      tagName: TAG_NAMES['28C'],
      rawValue: value,
      fields: { statementNumber: value },
      humanDescription: `Statement Number: ${value} (invalid format)`,
      issues,
    };
  }

  const statementNumber = match[1];
  const sequenceNumber = match[2];

  const desc = sequenceNumber
    ? `Statement ${statementNumber}, Sequence ${sequenceNumber}`
    : `Statement ${statementNumber}`;

  return {
    tag: '28C',
    tagName: TAG_NAMES['28C'],
    rawValue: value,
    fields: { statementNumber, sequenceNumber },
    humanDescription: desc,
    issues,
  };
}

function decodeBalance(tag: string, value: string): DecodedTag {
  const issues: ValidationIssue[] = [];
  const tagName = TAG_NAMES[tag] || `Balance (${tag})`;

  const match = value.match(/^([CD])(\d{6})([A-Z]{3})([0-9,]+)$/);
  if (!match) {
    issues.push({ severity: 'error', message: `Invalid balance format`, field: 'balance' });
    return {
      tag,
      tagName,
      rawValue: value,
      fields: {},
      humanDescription: `Balance: ${value} (invalid format)`,
      issues,
    };
  }

  const dcIndicator = match[1];
  const dateStr = match[2];
  const currency = match[3];
  const amountStr = match[4];

  const isDebit = dcIndicator === 'D';
  const dateParsed = parseYYMMDD(dateStr);
  const amountParsed = parseAmount(amountStr);

  if (!dateParsed.valid) {
    issues.push({ severity: 'warning', message: `Invalid date: ${dateStr}`, field: 'date' });
  }
  if (!amountParsed.valid) {
    issues.push({ severity: 'error', message: `Invalid amount: ${amountStr}`, field: 'amount' });
  }

  const dcDesc = isDebit ? 'Debit (negative)' : 'Credit (positive)';
  const desc = `${tagName}: ${currency} ${amountParsed.amount} ${dcDesc} as of ${dateParsed.formatted}`;

  return {
    tag,
    tagName,
    rawValue: value,
    fields: {
      isDebit,
      date: dateParsed.date,
      dateFormatted: dateParsed.formatted,
      currency,
      amount: amountStr,
      amountNumeric: amountParsed.numeric,
    } as DecodedBalance,
    humanDescription: desc,
    issues,
  };
}

export function decodeTag60F(value: string): DecodedTag {
  return decodeBalance('60F', value);
}

export function decodeTag60M(value: string): DecodedTag {
  return decodeBalance('60M', value);
}

export function decodeTag62F(value: string): DecodedTag {
  return decodeBalance('62F', value);
}

export function decodeTag62M(value: string): DecodedTag {
  return decodeBalance('62M', value);
}

export function decodeTag64(value: string): DecodedTag {
  return decodeBalance('64', value);
}

export function decodeTag65(value: string): DecodedTag {
  return decodeBalance('65', value);
}

/**
 * Parse :61: Statement Line (Transaction)
 * Format: YYMMDD[MMDD][R]D/C[funds]Amount,DecNTYPRef[//BankRef][CRLF/supplementary]
 */
export function decodeTag61(value: string, supplementaryLine?: string): DecodedTag {
  const issues: ValidationIssue[] = [];

  const regex = /^(\d{6})(\d{4})?(R)?([CD])([A-Z])?([0-9,]+)([A-Z]\w{3})(.+?)(?:\/\/(.+))?$/;
  const match = value.match(regex);

  if (!match) {
    issues.push({ severity: 'error', message: 'Invalid :61: transaction format', field: 'transaction' });
    return {
      tag: '61',
      tagName: TAG_NAMES['61'],
      rawValue: value,
      fields: {},
      humanDescription: `Transaction: ${value} (invalid format)`,
      issues,
    };
  }

  const [, valueDateStr, entryDateStr, reversal, dcIndicator, fundsCode, amountStr, typeCode, customerRef, bankRef] = match;

  const valueDateParsed = parseYYMMDD(valueDateStr);
  if (!valueDateParsed.valid) {
    issues.push({ severity: 'warning', message: `Invalid value date: ${valueDateStr}`, field: 'valueDate' });
  }

  let entryDateParsed: { date: string; formatted: string; valid: boolean } | undefined;
  if (entryDateStr) {
    const refYear = parseInt(valueDateParsed.date.slice(0, 4), 10);
    entryDateParsed = parseMMDD(entryDateStr, refYear);
    if (!entryDateParsed.valid) {
      issues.push({ severity: 'warning', message: `Invalid entry date: ${entryDateStr}`, field: 'entryDate' });
    }
  }

  const amountParsed = parseAmount(amountStr);
  if (!amountParsed.valid) {
    issues.push({ severity: 'error', message: `Invalid amount: ${amountStr}`, field: 'amount' });
  }

  const transactionType = decodeTransactionType(typeCode);
  if (!transactionType.isKnown) {
    issues.push({ severity: 'warning', message: `Unknown transaction type: ${typeCode}`, field: 'transactionType' });
  }

  const isDebit = dcIndicator === 'D';
  const isReversal = reversal === 'R';

  const dcDesc = isDebit ? 'Debit' : 'Credit';
  const reversalDesc = isReversal ? ' (Reversal)' : '';
  const typeDesc = formatTransactionType(transactionType);
  const entryDesc = entryDateParsed ? `, Entry: ${entryDateParsed.formatted}` : '';
  const bankRefDesc = bankRef ? `, Bank Ref: ${bankRef}` : '';
  const suppDesc = supplementaryLine ? `, Supplementary: ${supplementaryLine}` : '';

  const desc = `${dcDesc}${reversalDesc} ${amountParsed.amount} | ${typeDesc} | Value: ${valueDateParsed.formatted}${entryDesc} | Ref: ${customerRef}${bankRefDesc}${suppDesc}`;

  const fields: DecodedTransaction = {
    valueDate: valueDateParsed.date,
    valueDateFormatted: valueDateParsed.formatted,
    entryDate: entryDateParsed?.date,
    entryDateFormatted: entryDateParsed?.formatted,
    isDebit,
    isReversal,
    fundsCode,
    amount: amountStr,
    amountNumeric: amountParsed.numeric,
    transactionType,
    customerReference: customerRef,
    bankReference: bankRef,
    supplementary: supplementaryLine,
  };

  return {
    tag: '61',
    tagName: TAG_NAMES['61'],
    rawValue: supplementaryLine ? `${value}\n${supplementaryLine}` : value,
    fields,
    humanDescription: desc,
    issues,
  };
}

export function decodeTag86(value: string): DecodedTag {
  const issues: ValidationIssue[] = [];

  const subfields: Record<string, string> = {};
  const subfieldPattern = /\+(\d{2})([^+]*)/g;
  let match;
  let hasSubfields = false;

  while ((match = subfieldPattern.exec(value)) !== null) {
    hasSubfields = true;
    const code = match[1];
    const content = match[2].trim();
    subfields[code] = content;
  }

  let desc: string;
  if (hasSubfields) {
    const parts: string[] = [];
    if (subfields['20']) parts.push(`Ref: ${subfields['20']}`);
    if (subfields['21']) parts.push(`Related: ${subfields['21']}`);
    if (subfields['32']) parts.push(`Beneficiary: ${subfields['32']}`);
    if (subfields['33']) parts.push(subfields['33']);
    if (subfields['23']) parts.push(`Info: ${subfields['23']}`);
    if (subfields['30']) parts.push(`Bank BIC: ${subfields['30']}`);
    if (subfields['31']) parts.push(`Account: ${subfields['31']}`);

    desc = parts.length > 0 ? `Narrative: ${parts.join(' | ')}` : `Narrative: ${value.slice(0, 100)}...`;
  } else {
    desc = `Narrative: ${value.length > 100 ? value.slice(0, 100) + '...' : value}`;
  }

  return {
    tag: '86',
    tagName: TAG_NAMES['86'],
    rawValue: value,
    fields: { subfields, hasSubfields, rawNarrative: value },
    humanDescription: desc,
    issues,
  };
}

export function decodeTag(tag: string, value: string, supplementaryLine?: string): DecodedTag {
  switch (tag) {
    case '20': return decodeTag20(value);
    case '21': return decodeTag21(value);
    case '25': return decodeTag25(value);
    case '28C': return decodeTag28C(value);
    case '60F': return decodeTag60F(value);
    case '60M': return decodeTag60M(value);
    case '61': return decodeTag61(value, supplementaryLine);
    case '62F': return decodeTag62F(value);
    case '62M': return decodeTag62M(value);
    case '64': return decodeTag64(value);
    case '65': return decodeTag65(value);
    case '86': return decodeTag86(value);
    default:
      return {
        tag,
        tagName: TAG_NAMES[tag] || `Unknown Tag (${tag})`,
        rawValue: value,
        fields: { value },
        humanDescription: `Unknown tag :${tag}: ${value}`,
        issues: [{ severity: 'info', message: `Unknown tag: ${tag}` }],
      };
  }
}

export interface ParsedLine {
  lineNumber: number;
  raw: string;
  decoded?: DecodedTag;
  isTagLine: boolean;
  isContinuation: boolean;
  isStatementSeparator: boolean;
}

export function parseLines(content: string): ParsedLine[] {
  const lines = content.split(/\r?\n/);
  const result: ParsedLine[] = [];
  const tagPattern = /^:(\d{2}[A-Z]?):(.*)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    if (line === '-') {
      result.push({
        lineNumber,
        raw: line,
        isTagLine: false,
        isContinuation: false,
        isStatementSeparator: true,
      });
      continue;
    }

    const tagMatch = line.match(tagPattern);
    if (tagMatch) {
      const tag = tagMatch[1];
      const value = tagMatch[2];

      let supplementary: string | undefined;
      if (tag === '61' && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (nextLine && !nextLine.startsWith(':') && nextLine !== '-') {
          supplementary = nextLine;
        }
      }

      result.push({
        lineNumber,
        raw: line,
        decoded: decodeTag(tag, value, supplementary),
        isTagLine: true,
        isContinuation: false,
        isStatementSeparator: false,
      });
    } else if (line.trim() === '') {
      result.push({
        lineNumber,
        raw: line,
        isTagLine: false,
        isContinuation: false,
        isStatementSeparator: false,
      });
    } else {
      const prevTagLine = result.filter(r => r.isTagLine).pop();
      const isCont = prevTagLine?.decoded?.tag === '61' || prevTagLine?.decoded?.tag === '86';

      result.push({
        lineNumber,
        raw: line,
        isTagLine: false,
        isContinuation: isCont,
        isStatementSeparator: false,
      });
    }
  }

  return result;
}

export function validateStatement(parsedLines: ParsedLine[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const tags = parsedLines.filter(l => l.decoded).map(l => l.decoded!.tag);

  const requiredTags = ['20', '25', '60F', '62F'];
  for (const tag of requiredTags) {
    const hasTag = tags.some(t => t === tag || (tag === '60F' && t === '60M') || (tag === '62F' && t === '62M'));
    if (!hasTag) {
      issues.push({ severity: 'error', message: `Missing required tag :${tag}:` });
    }
  }

  for (const line of parsedLines) {
    if (line.decoded) {
      issues.push(...line.decoded.issues);
    }
  }

  return issues;
}
