/**
 * BRD Bank Profile (Groupe Société Générale - Romania)
 * Decodes BRD-specific :86: subfield format using +NN notation.
 */

import type { BankProfile, DecodeResult, SubfieldResult } from './types.js';

const BRD_SUBFIELD_NAMES: Record<string, string> = {
  '20': 'Transaction Reference',
  '21': 'Related Reference',
  '22': 'Beneficiary Name',
  '23': 'BIC Code / Additional Info',
  '24': 'Ordering Customer Line 1',
  '25': 'Ordering Customer Line 2',
  '26': 'Ordering Customer Line 3',
  '27': 'Remittance Information Line 1',
  '28': 'Remittance Information Line 2',
  '29': 'Remittance Information Line 3',
  '30': 'Beneficiary Bank BIC',
  '31': 'Beneficiary Account (IBAN)',
  '32': 'Beneficiary Name Line 1',
  '33': 'Beneficiary Name Line 2',
  '34': 'Beneficiary Address Line 1',
  '35': 'Beneficiary Address Line 2',
  '60': 'Account Debited',
  '61': 'Account Credited',
  '62': 'Transaction Amount',
  '63': 'Original Currency Amount',
};

export const brdProfile: BankProfile = {
  name: 'BRD (Groupe Société Générale)',

  detectPattern: /\+20.*\+3[012]/,

  accountPattern: /^RO\d{2}BRDE/i,

  decodeSubfields(content: string): DecodeResult {
    const subfields: SubfieldResult[] = [];

    const pattern = /\+(\d{2})([^+]*)/g;
    let match;

    while ((match = pattern.exec(content)) !== null) {
      const code = match[1];
      const value = match[2].trim();

      subfields.push({
        code: `+${code}`,
        name: BRD_SUBFIELD_NAMES[code] || `Field ${code}`,
        value,
        raw: match[0],
      });
    }

    let unstructuredText: string | undefined;
    const prefixMatch = content.match(/^(\d{3})/);
    if (prefixMatch) {
      const codeMap: Record<string, string> = {
        '000': 'Standard Transfer',
        '001': 'Standing Order',
        '002': 'Direct Debit',
        '003': 'Card Transaction',
        '004': 'Cash Transaction',
        '005': 'Cheque',
        '010': 'Salary Payment',
        '020': 'Tax Payment',
        '050': 'Fee/Commission',
      };
      const txCode = prefixMatch[1];
      if (codeMap[txCode]) {
        subfields.unshift({
          code: 'TXC',
          name: 'Transaction Code',
          value: `${txCode} (${codeMap[txCode]})`,
          raw: txCode,
        });
      }
    }

    return {
      profileName: 'BRD',
      subfields,
      unstructuredText,
      raw: content,
    };
  },
};

export default brdProfile;
