/**
 * MT940 Transaction Type Codes
 * Based on SWIFT MT940 specification
 */

export interface TransactionType {
  code: string;
  name: string;
  description: string;
}

export const TRANSACTION_TYPE_PREFIXES: Record<string, string> = {
  S: 'SWIFT',
  N: 'Non-SWIFT',
  F: 'First advice',
};

export const TRANSACTION_TYPES: Record<string, TransactionType> = {
  // Non-SWIFT Transfer types (most common)
  TRF: { code: 'TRF', name: 'Transfer', description: 'General transfer' },
  TRI: { code: 'TRI', name: 'Transfer Initiation', description: 'Transfer initiation' },

  // Account Management
  BOE: { code: 'BOE', name: 'Bill of Exchange', description: 'Bill of exchange' },
  BRF: { code: 'BRF', name: 'Brokerage Fee', description: 'Brokerage fee' },
  CAR: { code: 'CAR', name: 'Securities', description: 'Securities-related item' },
  CAS: { code: 'CAS', name: 'Cash Letter', description: 'Cash letter' },
  CHG: { code: 'CHG', name: 'Charges', description: 'Charges and fees' },
  CHK: { code: 'CHK', name: 'Cheque', description: 'Cheque' },
  CLR: { code: 'CLR', name: 'Cash Letter Returned', description: 'Cash letter returned' },
  CMI: { code: 'CMI', name: 'Cash Management', description: 'Cash management item' },
  CMN: { code: 'CMN', name: 'Cash Management', description: 'Cash management – notional pooling' },
  CMP: { code: 'CMP', name: 'Compensation', description: 'Compensation claims' },
  CMS: { code: 'CMS', name: 'Cash Management', description: 'Cash management – sweeping' },
  CMT: { code: 'CMT', name: 'Cash Management', description: 'Cash management – topping' },
  CMZ: { code: 'CMZ', name: 'Cash Management', description: 'Cash management – zero balancing' },
  COL: { code: 'COL', name: 'Collection', description: 'Collections' },
  COM: { code: 'COM', name: 'Commission', description: 'Commission' },
  CPN: { code: 'CPN', name: 'Coupon', description: 'Coupon collection/payment' },
  DCR: { code: 'DCR', name: 'Documentary Credit', description: 'Documentary credit' },
  DDT: { code: 'DDT', name: 'Direct Debit', description: 'Direct debit' },
  DIV: { code: 'DIV', name: 'Dividend', description: 'Dividend payment' },
  EQA: { code: 'EQA', name: 'Equivalent Amount', description: 'Equivalent amount' },
  EXT: { code: 'EXT', name: 'External Transfer', description: 'External transfer' },
  FEX: { code: 'FEX', name: 'Foreign Exchange', description: 'Foreign exchange' },
  INT: { code: 'INT', name: 'Interest', description: 'Interest payment' },
  LBX: { code: 'LBX', name: 'Lockbox', description: 'Lockbox' },
  LDP: { code: 'LDP', name: 'Loan Deposit', description: 'Loan deposit' },
  LOA: { code: 'LOA', name: 'Loan', description: 'Loan' },
  LWN: { code: 'LWN', name: 'Loan Repayment', description: 'Loan repayment' },
  MSC: { code: 'MSC', name: 'Miscellaneous', description: 'Miscellaneous' },
  OVD: { code: 'OVD', name: 'Overdraft', description: 'Overdraft' },
  POS: { code: 'POS', name: 'Point of Sale', description: 'Point of sale / Card payment' },
  RCK: { code: 'RCK', name: 'Returned Cheque', description: 'Returned cheque' },
  REC: { code: 'REC', name: 'Receivable', description: 'Receivables' },
  RTI: { code: 'RTI', name: 'Returned Item', description: 'Returned item' },
  SAL: { code: 'SAL', name: 'Salary', description: 'Salary payment' },
  SEC: { code: 'SEC', name: 'Securities', description: 'Securities' },
  STO: { code: 'STO', name: 'Standing Order', description: 'Standing order' },
  TCK: { code: 'TCK', name: 'Travellers Cheque', description: 'Travellers cheque' },
  VDA: { code: 'VDA', name: 'Value Date Adj.', description: 'Value date adjustment' },
  WAR: { code: 'WAR', name: 'Warrant', description: 'Warrant' },
  ZBA: { code: 'ZBA', name: 'Zero Balance', description: 'Zero balance accounting' },
};

export interface DecodedTransactionType {
  prefix: string;
  prefixMeaning: string;
  code: string;
  name: string;
  description: string;
  isKnown: boolean;
}

export function decodeTransactionType(typeCode: string): DecodedTransactionType {
  if (!typeCode || typeCode.length < 4) {
    return {
      prefix: '',
      prefixMeaning: 'Unknown',
      code: typeCode || '',
      name: 'Unknown',
      description: 'Invalid or missing transaction type code',
      isKnown: false,
    };
  }

  const prefix = typeCode.charAt(0);
  const code = typeCode.slice(1, 4);
  const prefixMeaning = TRANSACTION_TYPE_PREFIXES[prefix] || 'Unknown';
  const typeInfo = TRANSACTION_TYPES[code];

  if (typeInfo) {
    return {
      prefix,
      prefixMeaning,
      code,
      name: typeInfo.name,
      description: typeInfo.description,
      isKnown: true,
    };
  }

  return {
    prefix,
    prefixMeaning,
    code,
    name: 'Unknown',
    description: `Unknown transaction type code: ${code}`,
    isKnown: false,
  };
}

export function formatTransactionType(decoded: DecodedTransactionType): string {
  const prefix = decoded.prefixMeaning ? `${decoded.prefixMeaning} ` : '';
  return `${prefix}${decoded.name}`;
}
