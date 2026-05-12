/**
 * Type definitions for mt940-js library parsed output.
 * Based on mt940-js v1.x structure.
 */

export interface MT940Balance {
  isCredit: boolean;
  date: string;
  currency: string;
  value: number;
}

export interface MT940ExtraDetails {
  name?: string;
  address?: string;
  account?: string;
  bankName?: string;
  fiscalCode?: string;
}

export interface MT940Transaction {
  id: string;
  code: string;
  fundsCode: string;
  isCredit: boolean;
  isExpense: boolean;
  currency: string;
  description: string;
  amount: number;
  valueDate: string;
  entryDate: string;
  customerReference: string;
  bankReference: string;
  transactionType?: string;
  extraDetails?: MT940ExtraDetails;
  balance?: MT940Balance;
}

export interface MT940Statement {
  referenceNumber: string;
  accountId: string;
  number: string;
  openingBalance: MT940Balance;
  closingBalance: MT940Balance;
  closingAvailableBalance?: MT940Balance;
  forwardAvailableBalance?: MT940Balance;
  additionalInformation?: string;
  transactions: MT940Transaction[];
}

export interface MT940ParsedData {
  statements: MT940Statement[];
}
