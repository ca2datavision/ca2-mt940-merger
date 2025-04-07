import { makeAutoObservable, runInAction } from 'mobx';
import * as mt940 from 'mt940-js';

export interface MT940File {
  id: string;
  name: string;
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

class FileStore {
  files: MT940File[] = [];
  selectedFileId: string | null = null;
  showCSVPreview: boolean = false;

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

  addFile = async (file: File) => {
    const id = crypto.randomUUID();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const statements = await mt940.read(reader.result);
          // Use runInAction to batch state updates
          runInAction(() => {
            this.files.push({
              id,
              name: file.name,
              parsed: { statements }
            });
          });
          resolve(undefined);
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
      this.files = this.files.filter(file => file.id !== id);
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
}

export const fileStore = new FileStore();