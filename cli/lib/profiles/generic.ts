/**
 * Generic Bank Profile
 * Fallback decoder for unknown bank formats.
 * Detects common patterns: +NN, ?NN, /XXX/
 */

import type { BankProfile, DecodeResult, SubfieldResult } from './types.js';

const GENERIC_SUBFIELD_NAMES: Record<string, string> = {
  '20': 'Transaction Reference',
  '21': 'Related Reference',
  '22': 'Beneficiary',
  '23': 'Additional Info',
  '24': 'Ordering Customer Line 1',
  '25': 'Ordering Customer Line 2',
  '26': 'Ordering Customer Line 3',
  '27': 'Remittance Info',
  '28': 'Remittance Info Line 2',
  '29': 'Remittance Info Line 3',
  '30': 'Bank BIC',
  '31': 'Account Number',
  '32': 'Name Line 1',
  '33': 'Name Line 2',
  '34': 'Address Line 1',
  '35': 'Address Line 2',
  '60': 'Account Debited',
  '61': 'Account Credited',
  '62': 'Sum of Amounts',
  '63': 'Number of Transactions',
};

function parseSubfields(content: string, delimiter: string, prefix: string): SubfieldResult[] {
  const results: SubfieldResult[] = [];
  const pattern = new RegExp(`\\${delimiter}(\\d{2})([^\\${delimiter}]*)`, 'g');
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const code = match[1];
    const value = match[2].trim();
    const fullCode = `${prefix}${code}`;

    results.push({
      code: fullCode,
      name: GENERIC_SUBFIELD_NAMES[code] || `Field ${code}`,
      value,
      raw: match[0],
    });
  }

  return results;
}

function parseSlashFields(content: string): SubfieldResult[] {
  const results: SubfieldResult[] = [];
  const pattern = /\/([A-Z]{2,4})\/(.*?)(?=\/[A-Z]{2,4}\/|$)/g;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const code = match[1];
    const value = match[2].trim();

    const names: Record<string, string> = {
      'EREF': 'End-to-End Reference',
      'KREF': 'Customer Reference',
      'MREF': 'Mandate Reference',
      'CREF': 'Cheque Reference',
      'PREF': 'Payment Reference',
      'SREF': 'Instruction Reference',
      'RREF': 'Related Reference',
      'IREF': 'Instruction ID',
      'BREF': 'Bank Reference',
      'ORDP': 'Ordering Party',
      'BENM': 'Beneficiary',
      'DEBT': 'Debtor',
      'CRED': 'Creditor',
      'ULTD': 'Ultimate Debtor',
      'ULTC': 'Ultimate Creditor',
      'PURP': 'Purpose',
      'REMI': 'Remittance Info',
      'IBAN': 'IBAN',
      'BIC': 'BIC',
      'NAME': 'Name',
      'ADDR': 'Address',
      'CITY': 'City',
      'CNTY': 'Country',
    };

    results.push({
      code: `/${code}/`,
      name: names[code] || `Field ${code}`,
      value,
      raw: match[0],
    });
  }

  return results;
}

export const genericProfile: BankProfile = {
  name: 'Generic',
  detectPattern: /./,

  decodeSubfields(content: string): DecodeResult {
    let subfields: SubfieldResult[] = [];
    let unstructuredText: string | undefined;

    const hasPlusSubfields = /\+\d{2}/.test(content);
    const hasQuestionSubfields = /\?\d{2}/.test(content);
    const hasSlashSubfields = /\/[A-Z]{2,4}\//.test(content);

    if (hasPlusSubfields) {
      subfields = parseSubfields(content, '+', '+');
    } else if (hasQuestionSubfields) {
      subfields = parseSubfields(content, '?', '?');
    } else if (hasSlashSubfields) {
      subfields = parseSlashFields(content);
    }

    if (subfields.length === 0) {
      unstructuredText = content;
    } else {
      const firstMatch = content.match(/^([^+?/]+?)(?=[+?]|[/]$)/);
      if (firstMatch && firstMatch[1].trim()) {
        const prefix = firstMatch[1].trim();
        if (prefix.length > 0 && !/^\d{3}$/.test(prefix)) {
          unstructuredText = prefix;
        }
      }
    }

    return {
      profileName: 'Generic',
      subfields,
      unstructuredText,
      raw: content,
    };
  },
};

export default genericProfile;
