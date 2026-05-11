import { makeAutoObservable, runInAction } from 'mobx';
import * as mt940 from 'mt940-js';
import { validateTextFile, extractZipSafely, type IgnoredFile } from '../utils/safety';
import { decodeText } from '../utils/encoding';
import { validateFileContent, validateContinuity, detectAllDuplicates } from '../validation';
import type { ValidationIssue, Statement } from '../types/validation';
import type { FileInfo, StatementInfo, TransactionInfo } from '../validation/duplicates';
import type { MT940ParsedData } from '../types/mt940';

export interface MT940File {
  id: string;
  name: string;
  contentHash: string;
  isDuplicate?: boolean;
  parsed?: MT940ParsedData;
  validationIssues?: ValidationIssue[];
  statements?: Statement[];
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

export interface FailedFile {
  name: string;
  reason: string;
}

export interface AddFileResult {
  addedCount: number;
  duplicateCount: number;
  ignoredCount: number;
  failedCount: number;
  cancelled?: boolean;
}

export interface ProcessingProgress {
  current: number;
  total: number;
  currentFile: string;
}

class FileStore {
  files: MT940File[] = [];
  selectedFileId: string | null = null;
  showCSVPreview: boolean = false;
  batchIssues: ValidationIssue[] = [];
  zipIgnored: IgnoredFile[] = [];
  zipFailed: FailedFile[] = [];
  isProcessing: boolean = false;
  progress: ProcessingProgress | null = null;
  private fileHashes: Set<string> = new Set();
  private abortController: AbortController | null = null;

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
        statements: validationResult.statements,
      });
    });

    return { isDuplicate: false };
  }

  addFile = async (file: File): Promise<AddFileResult> => {
    this.abortController = new AbortController();
    runInAction(() => {
      this.isProcessing = true;
      this.progress = { current: 0, total: 1, currentFile: file.name };
    });

    try {
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const buffer = reader.result as ArrayBuffer;

            if (file.name.toLowerCase().endsWith('.zip')) {
              const { files: extractedFiles, ignored } = await extractZipSafely(buffer);
              let addedCount = 0;
              let duplicateCount = 0;
              const failed: FailedFile[] = [];
              const total = extractedFiles.length;

              runInAction(() => {
                this.progress = { current: 0, total, currentFile: '' };
              });

              for (let i = 0; i < extractedFiles.length; i++) {
                if (this.abortController?.signal.aborted) {
                  runInAction(() => {
                    this.isProcessing = false;
                    this.progress = null;
                  });
                  resolve({
                    addedCount,
                    duplicateCount,
                    ignoredCount: ignored.length,
                    failedCount: failed.length,
                    cancelled: true,
                  });
                  return;
                }

                const extracted = extractedFiles[i];
                runInAction(() => {
                  this.progress = { current: i + 1, total, currentFile: extracted.name };
                });

                try {
                  const result = await this.processBuffer(extracted.content.buffer, extracted.name);
                  if (result.isDuplicate) {
                    duplicateCount++;
                  } else {
                    addedCount++;
                  }
                } catch (err) {
                  const reason = err instanceof Error ? err.message : String(err);
                  failed.push({ name: extracted.name, reason });
                }
              }

              runInAction(() => {
                this.zipIgnored = ignored;
                this.zipFailed = failed;
                this.isProcessing = false;
                this.progress = null;
              });

              resolve({
                addedCount,
                duplicateCount,
                ignoredCount: ignored.length,
                failedCount: failed.length,
              });
            } else {
              const result = await this.processBuffer(buffer, file.name);
              runInAction(() => {
                this.isProcessing = false;
                this.progress = null;
              });
              resolve({
                addedCount: result.isDuplicate ? 0 : 1,
                duplicateCount: result.isDuplicate ? 1 : 0,
                ignoredCount: 0,
                failedCount: 0,
              });
            }
          } catch (error) {
            runInAction(() => {
              this.isProcessing = false;
              this.progress = null;
            });
            reject(error);
          }
        };
        reader.onerror = (error) => {
          console.error('Error reading file:', error);
          runInAction(() => {
            this.isProcessing = false;
            this.progress = null;
          });
          reject(new Error('Failed to read MT940 file'));
        };
        reader.readAsArrayBuffer(file);
      });
    } finally {
      this.abortController = null;
    }
  };

  cancelProcessing = () => {
    if (this.abortController) {
      this.abortController.abort();
    }
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

  validateBatch = () => {
    const issues: ValidationIssue[] = [];

    // Collect all statements for continuity validation
    const allStatements: Statement[] = [];
    for (const file of this.files) {
      if (file.statements) {
        allStatements.push(...file.statements);
      }
    }

    // Run continuity validation
    if (allStatements.length > 0) {
      const continuityResult = validateContinuity(allStatements);
      issues.push(...continuityResult.issues);
    }

    // Prepare data for duplicate detection
    const fileInfos: FileInfo[] = this.files.map(f => ({
      id: f.id,
      name: f.name,
      hash: f.contentHash,
    }));

    const statementInfos: StatementInfo[] = [];
    const transactionInfos: TransactionInfo[] = [];

    for (const file of this.files) {
      if (!file.statements) continue;

      for (let si = 0; si < file.statements.length; si++) {
        const stmt = file.statements[si];

        statementInfos.push({
          fileId: file.id,
          fileName: file.name,
          statementIndex: si,
          accountId: stmt.accountId,
          currency: stmt.openingBalance.currency,
          statementNumber: stmt.statementNumber,
          openingDate: stmt.openingBalance.date,
          openingAmount: stmt.openingBalance.amount,
          closingDate: stmt.closingBalance.date,
          closingAmount: stmt.closingBalance.amount,
        });

        for (let ti = 0; ti < stmt.transactions.length; ti++) {
          const txn = stmt.transactions[ti];
          transactionInfos.push({
            fileId: file.id,
            fileName: file.name,
            statementIndex: si,
            transactionIndex: ti,
            accountId: stmt.accountId,
            currency: txn.currency,
            valueDate: txn.valueDate,
            entryDate: txn.entryDate,
            amount: txn.amount,
            isCredit: txn.isCredit,
            transactionType: txn.transactionType,
            reference: txn.customerReference,
            narrative: txn.description,
          });
        }
      }
    }

    // Run duplicate detection
    const duplicateResult = detectAllDuplicates(fileInfos, statementInfos, transactionInfos);
    issues.push(...duplicateResult.issues);

    runInAction(() => {
      this.batchIssues = issues;
    });
  };

  reset = () => {
    runInAction(() => {
      this.files = [];
      this.selectedFileId = null;
      this.showCSVPreview = false;
      this.batchIssues = [];
      this.zipIgnored = [];
      this.zipFailed = [];
      this.fileHashes.clear();
    });
  };

  clearZipStatus = () => {
    runInAction(() => {
      this.zipIgnored = [];
      this.zipFailed = [];
    });
  };
}

export const fileStore = new FileStore();