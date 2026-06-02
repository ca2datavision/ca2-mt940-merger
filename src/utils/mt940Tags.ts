/**
 * MT940 Tag Definitions
 * Centralized source of truth for tag explanations with EN/RO translations
 */

export interface LocalizedText {
  en: string;
  ro: string;
}

export interface TagDefinition {
  tag: string;
  name: LocalizedText;
  description: LocalizedText;
}

export const MT940_TAGS: Record<string, TagDefinition> = {
  ':20:': {
    tag: ':20:',
    name: { en: 'Transaction Reference', ro: 'Referință Tranzacție' },
    description: { en: "Sender's reference for the statement", ro: 'Referința expeditorului pentru extras' },
  },
  ':21:': {
    tag: ':21:',
    name: { en: 'Related Reference', ro: 'Referință Asociată' },
    description: { en: 'Reference to related message', ro: 'Referință la mesajul asociat' },
  },
  ':25:': {
    tag: ':25:',
    name: { en: 'Account Identification', ro: 'Identificare Cont' },
    description: { en: 'Account number (IBAN)', ro: 'Numărul contului (IBAN)' },
  },
  ':28:': {
    tag: ':28:',
    name: { en: 'Statement Number', ro: 'Număr Extras' },
    description: { en: 'Statement number (legacy format)', ro: 'Numărul extrasului (format vechi)' },
  },
  ':28C:': {
    tag: ':28C:',
    name: { en: 'Statement Number/Sequence', ro: 'Număr Extras/Secvență' },
    description: { en: 'Statement number and optional page sequence', ro: 'Numărul extrasului și secvența opțională a paginii' },
  },
  ':60F:': {
    tag: ':60F:',
    name: { en: 'Opening Balance (First)', ro: 'Sold Inițial (Prim)' },
    description: { en: 'Balance at start of statement period', ro: 'Soldul la începutul perioadei extrasului' },
  },
  ':60M:': {
    tag: ':60M:',
    name: { en: 'Opening Balance (Intermediate)', ro: 'Sold Inițial (Intermediar)' },
    description: { en: 'Intermediate opening balance', ro: 'Sold inițial intermediar' },
  },
  ':61:': {
    tag: ':61:',
    name: { en: 'Statement Line', ro: 'Linie Extras' },
    description: { en: 'Transaction: date, amount, type, reference', ro: 'Tranzacție: dată, sumă, tip, referință' },
  },
  ':62F:': {
    tag: ':62F:',
    name: { en: 'Closing Balance (Final)', ro: 'Sold Final' },
    description: { en: 'Balance at end of statement period', ro: 'Soldul la sfârșitul perioadei extrasului' },
  },
  ':62M:': {
    tag: ':62M:',
    name: { en: 'Closing Balance (Intermediate)', ro: 'Sold Final (Intermediar)' },
    description: { en: 'Intermediate closing balance', ro: 'Sold final intermediar' },
  },
  ':64:': {
    tag: ':64:',
    name: { en: 'Closing Available Balance', ro: 'Sold Disponibil Final' },
    description: { en: 'Available balance at closing', ro: 'Soldul disponibil la închidere' },
  },
  ':65:': {
    tag: ':65:',
    name: { en: 'Forward Available Balance', ro: 'Sold Disponibil Viitor' },
    description: { en: 'Projected available balance', ro: 'Soldul disponibil proiectat' },
  },
  ':86:': {
    tag: ':86:',
    name: { en: 'Information to Account Owner', ro: 'Informații pentru Titular' },
    description: { en: 'Transaction details/narrative', ro: 'Detalii tranzacție/narativ' },
  },
};

export const BRD_SUBFIELDS: Record<string, TagDefinition> = {
  '+20': {
    tag: '+20',
    name: { en: 'Transaction Reference', ro: 'Referință Tranzacție' },
    description: { en: 'Payment reference number', ro: 'Număr de referință plată' },
  },
  '+21': {
    tag: '+21',
    name: { en: 'Related Reference', ro: 'Referință Asociată' },
    description: { en: 'Related transaction reference', ro: 'Referință tranzacție asociată' },
  },
  '+22': {
    tag: '+22',
    name: { en: 'Beneficiary Details', ro: 'Detalii Beneficiar' },
    description: { en: 'Additional beneficiary information', ro: 'Informații suplimentare beneficiar' },
  },
  '+23': {
    tag: '+23',
    name: { en: 'Payment Details', ro: 'Detalii Plată' },
    description: { en: 'Remittance information', ro: 'Informații despre remitere' },
  },
  '+24': {
    tag: '+24',
    name: { en: 'Ordering Customer', ro: 'Client Ordonator' },
    description: { en: 'Payer name (line 1)', ro: 'Numele plătitorului (linia 1)' },
  },
  '+25': {
    tag: '+25',
    name: { en: 'Ordering Customer 2', ro: 'Client Ordonator 2' },
    description: { en: 'Payer name (line 2)', ro: 'Numele plătitorului (linia 2)' },
  },
  '+30': {
    tag: '+30',
    name: { en: 'Beneficiary Bank BIC', ro: 'BIC Bancă Beneficiar' },
    description: { en: 'SWIFT code of beneficiary bank', ro: 'Codul SWIFT al băncii beneficiarului' },
  },
  '+31': {
    tag: '+31',
    name: { en: 'Counterparty Account', ro: 'Cont Contrapartidă' },
    description: { en: 'Counterparty IBAN', ro: 'IBAN contrapartidă' },
  },
  '+32': {
    tag: '+32',
    name: { en: 'Beneficiary Name', ro: 'Nume Beneficiar' },
    description: { en: 'Counterparty name (line 1)', ro: 'Numele contrapartidei (linia 1)' },
  },
  '+33': {
    tag: '+33',
    name: { en: 'Beneficiary Name 2', ro: 'Nume Beneficiar 2' },
    description: { en: 'Counterparty name (line 2)', ro: 'Numele contrapartidei (linia 2)' },
  },
};

export const TRANSACTION_TYPE_PREFIXES: Record<string, LocalizedText> = {
  S: { en: 'SWIFT', ro: 'SWIFT' },
  N: { en: 'Non-SWIFT', ro: 'Non-SWIFT' },
  F: { en: 'First Advice', ro: 'Prima Notificare' },
};

export const TRANSACTION_TYPES: Record<string, LocalizedText> = {
  TRF: { en: 'Transfer', ro: 'Transfer' },
  TRI: { en: 'Transfer Initiation', ro: 'Inițiere Transfer' },
  BOE: { en: 'Bill of Exchange', ro: 'Cambie' },
  BRF: { en: 'Brokerage Fee', ro: 'Comision Brokeraj' },
  CAR: { en: 'Securities', ro: 'Titluri de Valoare' },
  CAS: { en: 'Cash Letter', ro: 'Scrisoare de Numerar' },
  CHG: { en: 'Charges', ro: 'Comisioane' },
  CHK: { en: 'Cheque', ro: 'Cec' },
  CLR: { en: 'Cash Letter Returned', ro: 'Scrisoare Numerar Returnată' },
  CMI: { en: 'Cash Management', ro: 'Administrare Numerar' },
  CMN: { en: 'Cash Management Notional', ro: 'Administrare Numerar Noțional' },
  CMP: { en: 'Compensation', ro: 'Compensație' },
  CMS: { en: 'Cash Management Sweeping', ro: 'Administrare Numerar Sweeping' },
  CMT: { en: 'Cash Management Topping', ro: 'Administrare Numerar Topping' },
  CMZ: { en: 'Cash Management Zero Balance', ro: 'Administrare Numerar Sold Zero' },
  COL: { en: 'Collection', ro: 'Încasare' },
  COM: { en: 'Commission', ro: 'Comision' },
  CPN: { en: 'Coupon', ro: 'Cupon' },
  DCR: { en: 'Documentary Credit', ro: 'Credit Documentar' },
  DDT: { en: 'Direct Debit', ro: 'Debit Direct' },
  DIV: { en: 'Dividend', ro: 'Dividend' },
  EQA: { en: 'Equivalent Amount', ro: 'Sumă Echivalentă' },
  EXT: { en: 'External Transfer', ro: 'Transfer Extern' },
  FEX: { en: 'Foreign Exchange', ro: 'Schimb Valutar' },
  INT: { en: 'Interest', ro: 'Dobândă' },
  LBX: { en: 'Lockbox', ro: 'Cutie Poștală Bancară' },
  LDP: { en: 'Loan Deposit', ro: 'Depozit Împrumut' },
  LOA: { en: 'Loan', ro: 'Împrumut' },
  LWN: { en: 'Loan Repayment', ro: 'Rambursare Împrumut' },
  MSC: { en: 'Miscellaneous', ro: 'Diverse' },
  OVD: { en: 'Overdraft', ro: 'Descoperit de Cont' },
  POS: { en: 'Point of Sale', ro: 'Punct de Vânzare' },
  RCK: { en: 'Returned Cheque', ro: 'Cec Returnat' },
  REC: { en: 'Receivable', ro: 'Creanță' },
  RTI: { en: 'Returned Item', ro: 'Articol Returnat' },
  SAL: { en: 'Salary', ro: 'Salariu' },
  SEC: { en: 'Securities', ro: 'Titluri' },
  STO: { en: 'Standing Order', ro: 'Ordin Permanent' },
  TCK: { en: 'Travellers Cheque', ro: 'Cec de Călătorie' },
  VDA: { en: 'Value Date Adjustment', ro: 'Ajustare Dată Valută' },
  WAR: { en: 'Warrant', ro: 'Warrant' },
  ZBA: { en: 'Zero Balance Accounting', ro: 'Contabilitate Sold Zero' },
};

export const DC_INDICATORS: Record<string, LocalizedText> = {
  C: { en: 'Credit', ro: 'Credit' },
  D: { en: 'Debit', ro: 'Debit' },
  RC: { en: 'Reversal Credit', ro: 'Stornare Credit' },
  RD: { en: 'Reversal Debit', ro: 'Stornare Debit' },
};

export type Locale = 'en' | 'ro';

export function getTagDefinition(
  tag: string,
  locale: Locale
): { name: string; description: string } | undefined {
  const def = MT940_TAGS[tag];
  if (!def) return undefined;
  return {
    name: def.name[locale],
    description: def.description[locale],
  };
}

export function getSubfieldDefinition(
  code: string,
  locale: Locale
): { name: string; description: string } | undefined {
  const def = BRD_SUBFIELDS[code];
  if (!def) return undefined;
  return {
    name: def.name[locale],
    description: def.description[locale],
  };
}

export function getTransactionTypeName(code: string, locale: Locale): string {
  if (!code) return '';

  const baseCode = code.length >= 4 ? code.slice(1, 4) : code;
  const typeText = TRANSACTION_TYPES[baseCode];

  if (!typeText) {
    return code;
  }

  if (code.length >= 4) {
    const prefix = code.charAt(0);
    const prefixText = TRANSACTION_TYPE_PREFIXES[prefix];
    if (prefixText) {
      return `${prefixText[locale]} ${typeText[locale]}`;
    }
  }

  return typeText[locale];
}

export function getDCIndicatorName(indicator: string, locale: Locale): string {
  const text = DC_INDICATORS[indicator.toUpperCase()];
  return text ? text[locale] : indicator;
}
