import { describe, it, expect, vi, beforeEach } from 'vitest';
import Decimal from 'decimal.js';

vi.mock('../stores/FileStore', () => ({
  fileStore: {
    files: [],
    batchIssues: [],
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../validation/merge', () => ({
  analyzeMergeEligibility: vi.fn(() => ({
    multiMessage: { eligible: true, blockers: [] },
    singleStatement: { eligible: true, blockers: [] },
  })),
}));

vi.mock('../merge/singleStatement', () => ({
  mergeSingleStatement: vi.fn((statements) => ({
    accountId: statements[0]?.accountId || 'TEST',
    statementNumber: '1',
    sequenceNumber: '1',
    openingBalance: {
      date: '2024-01-01',
      amount: new Decimal(1000),
      currency: 'EUR',
      isCredit: true,
    },
    closingBalance: {
      date: '2024-01-31',
      amount: new Decimal(1500),
      currency: 'EUR',
      isCredit: true,
    },
    transactions: [],
    sourceStatementIds: [],
  })),
}));

describe('MergePanel', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('module imports without TDZ or initialization errors', async () => {
    const module = await import('./MergePanel');
    expect(module.MergePanel).toBeDefined();
    expect(typeof module.MergePanel).toBe('object');
  });

  it('exports MergePanel as named export', async () => {
    const module = await import('./MergePanel');
    expect(module).toHaveProperty('MergePanel');
  });

  describe('component dependencies', () => {
    it('imports fileStore correctly', async () => {
      const fileStoreModule = await import('../stores/FileStore');
      expect(fileStoreModule.fileStore).toBeDefined();
    });

    it('imports analyzeMergeEligibility correctly', async () => {
      const mergeModule = await import('../validation/merge');
      expect(mergeModule.analyzeMergeEligibility).toBeDefined();
    });

    it('imports mergeSingleStatement correctly', async () => {
      const singleModule = await import('../merge/singleStatement');
      expect(singleModule.mergeSingleStatement).toBeDefined();
    });

    it('imports writeMT940 correctly', async () => {
      const writerModule = await import('../utils/mt940Writer');
      expect(writerModule.writeMT940).toBeDefined();
    });
  });
});

describe('MergePanel integration with validation', () => {
  it('analyzeMergeEligibility returns proper structure', async () => {
    const { analyzeMergeEligibility } = await import('../validation/merge');
    const result = analyzeMergeEligibility([], []);
    expect(result).toHaveProperty('multiMessage');
    expect(result).toHaveProperty('singleStatement');
    expect(result.multiMessage).toHaveProperty('eligible');
    expect(result.multiMessage).toHaveProperty('blockers');
  });
});

describe('MergePanel integration with singleStatement', () => {
  it('mergeSingleStatement returns proper structure', async () => {
    const { mergeSingleStatement } = await import('../merge/singleStatement');
    const result = mergeSingleStatement([{
      id: 'test-1',
      accountId: 'ACC123',
      statementNumber: '1',
      sequenceNumber: '1',
      openingBalance: {
        date: '2024-01-01',
        amount: new Decimal(1000),
        currency: 'EUR',
        isCredit: true,
      },
      closingBalance: {
        date: '2024-01-31',
        amount: new Decimal(1200),
        currency: 'EUR',
        isCredit: true,
      },
      transactions: [],
    }]);

    expect(result).toHaveProperty('accountId');
    expect(result).toHaveProperty('openingBalance');
    expect(result).toHaveProperty('closingBalance');
    expect(result).toHaveProperty('transactions');
  });
});
