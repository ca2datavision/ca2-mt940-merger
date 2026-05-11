import { makeAutoObservable, runInAction } from 'mobx';
import * as mt940 from 'mt940-js';
import { validateTextFile, extractZipSafely } from '../utils/safety';
import { decodeText } from '../utils/encoding';
import { validateFileContent, type FileValidationResult } from '../validation';
import type { ValidationIssue } from '../types/validation';
import type { MT940ParsedData } from '../types/mt940';

export interface MT940File {
  id: string;
  name: string;
  contentHash: string;
  isDuplicate?: boolean;
  parsed?: MT940ParsedData;
  validationIssues?: ValidationIssue[];
}

export interface CSVRow {
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

interface DateRange {
  min: string;
  max: string;
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

class FileStore {
  files: MT940File[] = [];
  selectedFileId: string | null = null;
  showCSVPreview: boolean = false;
  private fileHashes: Set<string> = new Set();

  // SHA-256 hash for duplicate detection. Requires secure context (HTTPS).
  private async computeHash(buffer: ArrayBuffer): Promise<string> {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      throw new Error('Secure context required: crypto.subtle unavailable. Use HTTPS.');
    }
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-');
      return `${day}.${month}.${year}`;
    } catch {
      return dateStr;
    }
  }

  constructor() {
    makeAutoObservable(this);
  }

  private async processBuffer(buffer: ArrayBuffer, fileName: string): Promise<{ isDuplicate: boolean }> {
    const contentHash = await this.computeHash(buffer);

    if (this.fileHashes.has(contentHash)) {
      return { isDuplicate: true };
    }

    const data = new Uint8Array(buffer);
    validateTextFile(data);

    const id = generateUUID();
    const textContent = decodeText(data);
    const validationResult = validateFileContent(textContent, id, fileName);

    const statements = await mt940.read(buffer);

    runInAction(() => {
      this.fileHashes.add(contentHash);
      this.files.push({
        id,
        name: fileName,
        contentHash,
        parsed: { statements },
        validationIssues: validationResult.issues,
      });
    });

    return { isDuplicate: false };
  }

  addFile = async (file: File): Promise<{ isDuplicate: boolean }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const buffer = reader.result as ArrayBuffer;

          if (file.name.toLowerCase().endsWith('.zip')) {
            const extractedFiles = await extractZipSafely(buffer);
            let anyAdded = false;

            for (const extracted of extractedFiles) {
              if (!extracted.name.toLowerCase().endsWith('.sta') &&
                  !extracted.name.toLowerCase().endsWith('.mt940')) {
                continue;
              }
              const result = await this.processBuffer(extracted.content.buffer, extracted.name);
              if (!result.isDuplicate) anyAdded = true;
            }

            resolve({ isDuplicate: !anyAdded });
          } else {
            const result = await this.processBuffer(buffer, file.name);
            resolve(result);
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        reject(new Error('Failed to read MT940 file'));
      };
      reader.readAsArrayBuffer(file);
    });
  };

  removeFile = (id: string) => {
    runInAction(() => {
      const file = this.files.find(f => f.id === id);
      if (file) {
        this.fileHashes.delete(file.contentHash);
      }
      this.files = this.files.filter(f => f.id !== id);
      if (this.selectedFileId === id) {
        this.selectedFileId = null;
      }
    });
  };

  setSelectedFile = (id: string | null) => {
    runInAction(() => {
      this.selectedFileId = id;
    });
  };

  setShowCSVPreview = (show: boolean) => {
    runInAction(() => {
      this.showCSVPreview = show;
    });
  };

  get selectedFile() {
    return this.files.find(file => file.id === this.selectedFileId);
  }

  getTransactionDateRange(): DateRange {
    let minDate = '';
    let maxDate = '';

    for (const file of this.files) {
      if (!file.parsed) continue;

      for (const statement of file.parsed.statements) {
        for (const transaction of statement.transactions) {
          const date = transaction.entryDate;
          if (!date) continue;

          if (!minDate || date < minDate) minDate = date;
          if (!maxDate || date > maxDate) maxDate = date;
        }
      }
    }

    return { min: this.formatDate(minDate), max: this.formatDate(maxDate) };
  }

  getFirstAccountId(): string {
    for (const file of this.files) {
      if (!file.parsed) continue;
      for (const statement of file.parsed.statements) {
        if (statement.accountId) {
          return statement.accountId;
        }
      }
    }
    return '';
  }

  convertToCSV(): CSVRow[] {
    const rows: CSVRow[] = [];
    const seenTransactions: Set<string> = new Set();

    for (const file of this.files) {
      if (!file.parsed) continue;

      for (const statement of file.parsed.statements) {
        for (const transaction of statement.transactions) {
          // Create unique transaction ID from its properties
          const transactionId = `${statement.accountId}-${transaction.entryDate}-${transaction.amount}-${transaction.transactionType}-${transaction.description}`;
          
          // Skip if we've seen this transaction before
          if (seenTransactions.has(transactionId)) {
            continue;
          }
          
          seenTransactions.add(transactionId);
          
          rows.push({
            numarCont: statement.accountId || '',
            dataProcesarii: this.formatDate(transaction.entryDate),
            suma: transaction.amount || '',
            valuta: transaction.currency || '',
            tipTranzactie: transaction.transactionType || '',
            numeContrapartida: transaction.extraDetails?.name || '',
            adresaContrapartida: transaction.extraDetails?.address || '',
            contContrapartida: transaction.extraDetails?.account || '',
            bancaContrapartida: transaction.extraDetails?.bankName || '',
            detaliiTranzactie: transaction.description || '',
            soldIntermediar: transaction.balance?.amount || '',
            cuiContrapartida: transaction.extraDetails?.fiscalCode || ''
          });
        }
      }
    }

    return rows;
  }

  reset = () => {
    runInAction(() => {
      this.files = [];
      this.selectedFileId = null;
      this.showCSVPreview = false;
      this.fileHashes.clear();
    });
  };
}

export const fileStore = new FileStore();