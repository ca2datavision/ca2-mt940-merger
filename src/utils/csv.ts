const FORMULA_PREFIXES = ['=', '+', '-', '@'];

export function escapeCSVField(value: unknown, preventFormula = true): string {
  let str = String(value ?? '');

  if (preventFormula && str.length > 0 && FORMULA_PREFIXES.includes(str[0])) {
    str = `'${str}`;
  }

  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r') || str.startsWith("'")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function rowToCSV(row: Record<string, unknown>, preventFormula = true): string {
  return Object.values(row).map(v => escapeCSVField(v, preventFormula)).join(',');
}

export function toCSV(headers: string[], rows: Record<string, unknown>[], preventFormula = true): string {
  return [
    headers.map(h => escapeCSVField(h, preventFormula)).join(','),
    ...rows.map(r => rowToCSV(r, preventFormula))
  ].join('\n');
}

export type CSVMode = 'basic' | 'enhanced';

export const BASIC_HEADERS = [
  'numar cont', 'data procesarii', 'suma', 'valuta',
  'tip tranzactie', 'nume beneficiar/ordonator',
  'adresa beneficiar/ordonator', 'cont beneficiar/ordonator',
  'banca beneficiar/ordonator', 'detalii tranzactie',
  'sold intermediar', 'CUI Contrapartida'
];

export const ENHANCED_HEADERS = [
  'source_file', 'zip_path', 'account_id', 'currency',
  'statement_number', 'sequence_number', 'value_date', 'entry_date',
  'debit_credit', 'amount', 'signed_amount', 'transaction_type',
  'customer_reference', 'bank_reference', 'supplementary_details',
  'narrative', 'opening_balance', 'closing_balance', 'fingerprint'
];

export interface EnhancedCSVRow {
  source_file: string;
  zip_path: string;
  account_id: string;
  currency: string;
  statement_number: string;
  sequence_number: string;
  value_date: string;
  entry_date: string;
  debit_credit: 'C' | 'D';
  amount: string;
  signed_amount: string;
  transaction_type: string;
  customer_reference: string;
  bank_reference: string;
  supplementary_details: string;
  narrative: string;
  opening_balance: string;
  closing_balance: string;
  fingerprint: string;
}

export interface BasicCSVRow {
  numarCont: string;
  dataProcesarii: string;
  suma: string;
  valuta: string;
  tipTranzactie: string;
  numeContrapartida: string;
  adresaContrapartida: string;
  contContrapartida: string;
  bancaContrapartida: string;
  detaliiTranzactie: string;
  soldIntermediar: string;
  cuiContrapartida: string;
}
