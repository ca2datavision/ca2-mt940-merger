import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runInAction } from 'mobx';

vi.mock('../utils/safety', () => ({
  extractZipSafely: vi.fn(),
}));

vi.mock('../validation', () => ({
  validateContinuity: vi.fn(() => ({ issues: [] })),
  detectAllDuplicates: vi.fn(() => ({ issues: [] })),
}));

vi.mock('../workers/parseService', () => ({
  parseFile: vi.fn(),
}));

describe('FileStore', () => {
  let FileStoreModule: typeof import('./FileStore');
  let fileStore: typeof import('./FileStore').fileStore;

  beforeEach(async () => {
    vi.resetModules();
    FileStoreModule = await import('./FileStore');
    fileStore = FileStoreModule.fileStore;
    fileStore.reset();
  });

  describe('initial state', () => {
    it('starts with empty files array', () => {
      expect(fileStore.files).toEqual([]);
    });

    it('starts with no selected file', () => {
      expect(fileStore.selectedFileId).toBeNull();
    });

    it('starts with showCSVPreview false', () => {
      expect(fileStore.showCSVPreview).toBe(false);
    });

    it('starts with empty batchIssues', () => {
      expect(fileStore.batchIssues).toEqual([]);
    });

    it('starts with isProcessing false', () => {
      expect(fileStore.isProcessing).toBe(false);
    });
  });

  describe('formatDate', () => {
    it('formats YYYY-MM-DD to DD.MM.YYYY', () => {
      expect(fileStore.formatDate('2024-03-15')).toBe('15.03.2024');
    });

    it('returns empty string for undefined', () => {
      expect(fileStore.formatDate(undefined)).toBe('');
    });

    it('handles malformed date string', () => {
      const result = fileStore.formatDate('invalid');
      expect(typeof result).toBe('string');
    });
  });

  describe('setSelectedFile', () => {
    it('sets selectedFileId', () => {
      fileStore.setSelectedFile('test-id');
      expect(fileStore.selectedFileId).toBe('test-id');
    });

    it('clears selectedFileId with null', () => {
      fileStore.setSelectedFile('test-id');
      fileStore.setSelectedFile(null);
      expect(fileStore.selectedFileId).toBeNull();
    });
  });

  describe('setShowCSVPreview', () => {
    it('sets showCSVPreview to true', () => {
      fileStore.setShowCSVPreview(true);
      expect(fileStore.showCSVPreview).toBe(true);
    });

    it('sets showCSVPreview to false', () => {
      fileStore.setShowCSVPreview(true);
      fileStore.setShowCSVPreview(false);
      expect(fileStore.showCSVPreview).toBe(false);
    });
  });

  describe('selectedFile getter', () => {
    it('returns undefined when no file selected', () => {
      expect(fileStore.selectedFile).toBeUndefined();
    });

    it('returns the selected file', () => {
      runInAction(() => {
        fileStore.files.push({
          id: 'test-id',
          name: 'test.mt940',
          contentHash: 'abc123',
        });
        fileStore.selectedFileId = 'test-id';
      });
      expect(fileStore.selectedFile?.name).toBe('test.mt940');
    });
  });

  describe('removeFile', () => {
    beforeEach(() => {
      runInAction(() => {
        fileStore.files.push(
          { id: 'file1', name: 'a.mt940', contentHash: 'hash1' },
          { id: 'file2', name: 'b.mt940', contentHash: 'hash2' }
        );
      });
    });

    it('removes file by id', () => {
      fileStore.removeFile('file1');
      expect(fileStore.files.length).toBe(1);
      expect(fileStore.files[0].id).toBe('file2');
    });

    it('clears selectedFileId if removed file was selected', () => {
      fileStore.setSelectedFile('file1');
      fileStore.removeFile('file1');
      expect(fileStore.selectedFileId).toBeNull();
    });

    it('keeps selectedFileId if different file removed', () => {
      fileStore.setSelectedFile('file2');
      fileStore.removeFile('file1');
      expect(fileStore.selectedFileId).toBe('file2');
    });
  });

  describe('reset', () => {
    it('clears all state', () => {
      runInAction(() => {
        fileStore.files.push({ id: '1', name: 'test.mt940', contentHash: 'x' });
        fileStore.selectedFileId = '1';
        fileStore.showCSVPreview = true;
        fileStore.batchIssues.push({ severity: 'error', code: 'TEST', message: 'test' });
      });

      fileStore.reset();

      expect(fileStore.files).toEqual([]);
      expect(fileStore.selectedFileId).toBeNull();
      expect(fileStore.showCSVPreview).toBe(false);
      expect(fileStore.batchIssues).toEqual([]);
    });
  });

  describe('getTransactionDateRange', () => {
    it('returns empty strings when no files', () => {
      const range = fileStore.getTransactionDateRange();
      expect(range.min).toBe('');
      expect(range.max).toBe('');
    });

    it('finds min and max dates across transactions', () => {
      runInAction(() => {
        fileStore.files.push({
          id: '1',
          name: 'test.mt940',
          contentHash: 'x',
          parsed: {
            statements: [
              {
                accountId: 'ACC1',
                transactions: [
                  { entryDate: '2024-01-15' },
                  { entryDate: '2024-03-20' },
                ],
              },
              {
                accountId: 'ACC1',
                transactions: [
                  { entryDate: '2024-02-10' },
                ],
              },
            ],
          },
        });
      });

      const range = fileStore.getTransactionDateRange();
      expect(range.min).toBe('15.01.2024');
      expect(range.max).toBe('20.03.2024');
    });
  });

  describe('getFirstAccountId', () => {
    it('returns empty string when no files', () => {
      expect(fileStore.getFirstAccountId()).toBe('');
    });

    it('returns first account id found', () => {
      runInAction(() => {
        fileStore.files.push({
          id: '1',
          name: 'test.mt940',
          contentHash: 'x',
          parsed: {
            statements: [
              { accountId: 'RO49AAAA1B31007593840000' },
            ],
          },
        });
      });

      expect(fileStore.getFirstAccountId()).toBe('RO49AAAA1B31007593840000');
    });
  });

  describe('convertToCSV', () => {
    it('returns empty array when no files', () => {
      expect(fileStore.convertToCSV()).toEqual([]);
    });

    it('converts transactions to CSV rows', () => {
      runInAction(() => {
        fileStore.files.push({
          id: '1',
          name: 'test.mt940',
          contentHash: 'x',
          parsed: {
            statements: [
              {
                accountId: 'ACC123',
                transactions: [
                  {
                    entryDate: '2024-01-15',
                    amount: '100.00',
                    currency: 'EUR',
                    transactionType: 'NMSC',
                    description: 'Test payment',
                  },
                ],
              },
            ],
          },
        });
      });

      const rows = fileStore.convertToCSV();
      expect(rows.length).toBe(1);
      expect(rows[0].numarCont).toBe('ACC123');
      expect(rows[0].dataProcesarii).toBe('15.01.2024');
      expect(rows[0].suma).toBe('100.00');
    });

    it('deduplicates transactions by fingerprint', () => {
      runInAction(() => {
        fileStore.files.push({
          id: '1',
          name: 'test.mt940',
          contentHash: 'x',
          parsed: {
            statements: [
              {
                accountId: 'ACC123',
                transactions: [
                  { entryDate: '2024-01-15', amount: '100', transactionType: 'NMSC', description: 'Test' },
                  { entryDate: '2024-01-15', amount: '100', transactionType: 'NMSC', description: 'Test' },
                ],
              },
            ],
          },
        });
      });

      const rows = fileStore.convertToCSV();
      expect(rows.length).toBe(1);
    });
  });

  describe('clearZipStatus', () => {
    it('clears zipIgnored and zipFailed', () => {
      runInAction(() => {
        fileStore.zipIgnored.push({ name: 'hidden.txt', reason: 'hidden' });
        fileStore.zipFailed.push({ name: 'bad.mt940', reason: 'parse error' });
      });

      fileStore.clearZipStatus();

      expect(fileStore.zipIgnored).toEqual([]);
      expect(fileStore.zipFailed).toEqual([]);
    });
  });
});
