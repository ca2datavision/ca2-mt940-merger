/**
 * Bank Profile Type Definitions
 * Pluggable system for decoding bank-specific :86: subfield formats.
 */

export interface SubfieldResult {
  code: string;
  name: string;
  value: string;
  raw: string;
}

export interface DecodeResult {
  profileName: string;
  subfields: SubfieldResult[];
  unstructuredText?: string;
  raw: string;
}

export interface BankProfile {
  name: string;
  detectPattern: RegExp;
  accountPattern?: RegExp;
  decodeSubfields(content: string): DecodeResult;
}

export interface ProfileMatch {
  profile: BankProfile;
  matchedBy: 'account' | 'content' | 'fallback';
  confidence: 'high' | 'medium' | 'low';
}
