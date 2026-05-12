import { describe, it, expect, vi } from 'vitest';

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

describe('MergePanel', () => {
  it('module imports without TDZ or initialization errors', async () => {
    const module = await import('./MergePanel');
    expect(module.MergePanel).toBeDefined();
    expect(typeof module.MergePanel).toBe('object');
  });
});
