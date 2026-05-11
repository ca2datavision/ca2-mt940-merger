import { makeAutoObservable, runInAction } from 'mobx';
import * as mt940 from 'mt940-js';

export interface MT940File {
  id: string;
  name: string;
  contentHash: string;
  isDuplicate?: boolean;
  parsed?: any;
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

  private async computeHash(buffer: ArrayBuffer): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    const bytes = new Uint8Array(buffer);
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < bytes.length; i++) {
      const ch = bytes[i];
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
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

  addFile = async (file: File): Promise<{ isDuplicate: boolean }> => {
    const id = generateUUID();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const buffer = reader.result as ArrayBuffer;
          const contentHash = await this.computeHash(buffer);

          if (this.fileHashes.has(contentHash)) {
            resolve({ isDuplicate: true });
            return;
          }

          const statements = await mt940.read(buffer);
          runInAction(() => {
            this.fileHashes.add(contentHash);
            this.files.push({
              id,
              name: file.name,
              contentHash,
              parsed: { statements }
            });
          });
          resolve({ isDuplicate: false });
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