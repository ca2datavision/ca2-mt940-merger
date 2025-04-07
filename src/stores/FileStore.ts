import { makeAutoObservable } from 'mobx';
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

  constructor() {
    makeAutoObservable(this);
  }

  addFile = async (file: File) => {
    const id = crypto.randomUUID();
    
    try {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const statements = await mt940.read(reader.result);
            this.files.push({
              id,
              name: file.name,
              parsed: { statements }
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
    } catch (error) {
      console.error('Failed to parse MT940 file:', error);
      throw new Error('Invalid MT940 file format');
    }
  };

  removeFile = (id: string) => {
    this.files = this.files.filter(file => file.id !== id);
    if (this.selectedFileId === id) {
      this.selectedFileId = null;
    }
  };

  setSelectedFile = (id: string | null) => {
    this.selectedFileId = id;
  };

  get selectedFile() {
    return this.files.find(file => file.id === this.selectedFileId);
  }

  convertToCSV(): CSVRow[] {
    const rows: CSVRow[] = [];
    
    for (const file of this.files) {
      if (!file.parsed) continue;
      
      for (const statement of file.parsed.statements) {
        for (const transaction of statement.transactions) {
          rows.push({
            numarCont: statement.accountIdentification || '',
            dataProcesarii: transaction.date || '',
            suma: transaction.amount.amount || '',
            valuta: transaction.amount.currency || '',
            tipTranzactie: transaction.transactionType || '',
            numeContrapartida: transaction.description || '',
            adresaContrapartida: transaction.extraDetails?.address || '',
            contContrapartida: transaction.extraDetails?.account || '',
            bancaContrapartida: transaction.extraDetails?.bankName || '',
            detaliiTranzactie: transaction.details || '',
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