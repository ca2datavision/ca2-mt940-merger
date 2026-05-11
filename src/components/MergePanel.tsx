import React, { useState, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Download, Eye, X, CheckSquare, Square, AlertCircle, FileStack, FileText } from 'lucide-react';
import { fileStore } from '../stores/FileStore';
import { writeMT940, convertParsedToWritable } from '../utils/mt940Writer';
import type { MT940Statement, MT940Transaction } from '../utils/mt940Writer';

interface StatementItem {
  id: string;
  fileId: string;
  fileName: string;
  accountId: string;
  statementNumber: string;
  date: string;
  transactionCount: number;
  statement: MT940Statement;
}

function mergeSingleStatement(statements: MT940Statement[]): MT940Statement {
  if (statements.length === 0) {
    return { transactions: [] };
  }
  if (statements.length === 1) {
    return statements[0];
  }

  const allTransactions: MT940Transaction[] = [];
  for (const stmt of statements) {
    if (stmt.transactions) {
      allTransactions.push(...stmt.transactions);
    }
  }

  allTransactions.sort((a, b) => {
    const dateA = a.valueDate || a.entryDate || '';
    const dateB = b.valueDate || b.entryDate || '';
    return dateA.localeCompare(dateB);
  });

  const first = statements[0];
  const last = statements[statements.length - 1];

  return {
    accountId: first.accountId,
    statementNumber: '1',
    sequenceNumber: '1',
    openingBalance: first.openingBalance,
    closingBalance: last.closingBalance,
    transactions: allTransactions,
  };
}

export const MergePanel: React.FC = observer(() => {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<'multi' | 'single'>('multi');

  const hasErrors = useMemo(() => {
    return fileStore.batchIssues.some(issue => issue.severity === 'error');
  }, [fileStore.batchIssues]);

  const errorCount = useMemo(() => {
    return fileStore.batchIssues.filter(issue => issue.severity === 'error').length;
  }, [fileStore.batchIssues]);

  const statementItems = useMemo((): StatementItem[] => {
    const items: StatementItem[] = [];
    for (const file of fileStore.files) {
      if (!file.parsed?.statements) continue;
      const writableStatements = convertParsedToWritable(file.parsed);

      file.parsed.statements.forEach((stmt, idx) => {
        const writable = writableStatements[idx];
        if (!writable) return;

        items.push({
          id: `${file.id}-${idx}`,
          fileId: file.id,
          fileName: file.name,
          accountId: stmt.accountId || 'Unknown',
          statementNumber: stmt.number || String(idx + 1),
          date: stmt.openingBalance?.date || '',
          transactionCount: stmt.transactions?.length || 0,
          statement: writable,
        });
      });
    }
    return items;
  }, [fileStore.files]);

  const selectedStatements = useMemo((): MT940Statement[] => {
    return statementItems
      .filter(item => selectedIds.has(item.id))
      .map(item => item.statement);
  }, [statementItems, selectedIds]);

  const multiMessageContent = useMemo((): string => {
    if (selectedStatements.length === 0) return '';
    return writeMT940(selectedStatements);
  }, [selectedStatements]);

  const singleStatementContent = useMemo((): string => {
    if (selectedStatements.length === 0) return '';
    const merged = mergeSingleStatement(selectedStatements);
    return writeMT940([merged]);
  }, [selectedStatements]);

  const previewContent = previewMode === 'multi' ? multiMessageContent : singleStatementContent;

  const canMergeMulti = selectedIds.size > 0 && !hasErrors;
  const canMergeSingle = selectedIds.size > 0 && !hasErrors;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(statementItems.map(item => item.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const downloadContent = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const downloadMulti = () => {
    if (!canMergeMulti) return;
    downloadContent(multiMessageContent, 'merged-multi.mt940');
  };

  const downloadSingle = () => {
    if (!canMergeSingle) return;
    downloadContent(singleStatementContent, 'merged-single.mt940');
  };

  const openPreview = (mode: 'multi' | 'single') => {
    setPreviewMode(mode);
    setShowPreview(true);
  };

  if (statementItems.length === 0) {
    return null;
  }

  const disabledReason = hasErrors
    ? t('merge.disabledErrors', { count: errorCount })
    : selectedIds.size === 0
    ? t('merge.disabledNoSelection')
    : null;

  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">
            {t('merge.title')}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-xs text-indigo-600 hover:text-indigo-800"
            >
              {t('merge.selectAll')}
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={deselectAll}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              {t('merge.deselectAll')}
            </button>
          </div>
        </div>
      </div>

      <div className="max-h-48 overflow-y-auto">
        <ul className="divide-y divide-gray-100">
          {statementItems.map(item => (
            <li
              key={item.id}
              className="px-4 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-3"
              onClick={() => toggleSelect(item.id)}
            >
              {selectedIds.has(item.id) ? (
                <CheckSquare className="h-4 w-4 text-indigo-600 flex-shrink-0" />
              ) : (
                <Square className="h-4 w-4 text-gray-400 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-900 truncate">
                  {item.accountId} - #{item.statementNumber}
                </div>
                <div className="text-xs text-gray-500">
                  {item.fileName} • {item.transactionCount} {t('merge.transactions')}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-600">
            {selectedIds.size > 0
              ? t('merge.selected', { count: selectedIds.size })
              : t('merge.selectToMerge')}
          </span>
        </div>

        {disabledReason && (
          <div className="mb-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {disabledReason}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => openPreview('multi')}
            disabled={!canMergeMulti}
            className={`inline-flex items-center px-3 py-1.5 border text-xs font-medium rounded ${
              canMergeMulti
                ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                : 'border-gray-200 text-gray-400 bg-gray-100 cursor-not-allowed'
            }`}
            title={disabledReason || t('merge.multiDesc')}
          >
            <Eye className="h-3 w-3 mr-1" />
            {t('merge.previewMulti')}
          </button>
          <button
            onClick={downloadMulti}
            disabled={!canMergeMulti}
            className={`inline-flex items-center px-3 py-1.5 border text-xs font-medium rounded ${
              canMergeMulti
                ? 'border-transparent text-white bg-indigo-600 hover:bg-indigo-700'
                : 'border-gray-200 text-gray-400 bg-gray-300 cursor-not-allowed'
            }`}
            title={disabledReason || t('merge.multiDesc')}
          >
            <FileStack className="h-3 w-3 mr-1" />
            {t('merge.downloadMulti')}
          </button>
          <button
            onClick={() => openPreview('single')}
            disabled={!canMergeSingle}
            className={`inline-flex items-center px-3 py-1.5 border text-xs font-medium rounded ${
              canMergeSingle
                ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                : 'border-gray-200 text-gray-400 bg-gray-100 cursor-not-allowed'
            }`}
            title={disabledReason || t('merge.singleDesc')}
          >
            <Eye className="h-3 w-3 mr-1" />
            {t('merge.previewSingle')}
          </button>
          <button
            onClick={downloadSingle}
            disabled={!canMergeSingle}
            className={`inline-flex items-center px-3 py-1.5 border text-xs font-medium rounded ${
              canMergeSingle
                ? 'border-transparent text-white bg-amber-600 hover:bg-amber-700'
                : 'border-gray-200 text-gray-400 bg-gray-300 cursor-not-allowed'
            }`}
            title={disabledReason || t('merge.singleDesc')}
          >
            <FileText className="h-3 w-3 mr-1" />
            {t('merge.downloadSingle')}
          </button>
        </div>
      </div>

      {showPreview && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                {previewMode === 'multi' ? t('merge.previewTitleMulti') : t('merge.previewTitleSingle')}
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-xs font-mono bg-gray-50 p-4 rounded border overflow-x-auto whitespace-pre">
                {previewContent}
              </pre>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => {
                  if (previewMode === 'multi') downloadMulti();
                  else downloadSingle();
                  setShowPreview(false);
                }}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                  previewMode === 'multi' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                <Download className="h-4 w-4 mr-2" />
                {t('merge.download')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
