import React, { useState, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Download, Eye, X, CheckSquare, Square } from 'lucide-react';
import { fileStore } from '../stores/FileStore';
import { writeMT940, convertParsedToWritable } from '../utils/mt940Writer';
import type { MT940Statement } from '../utils/mt940Writer';

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

export const MergePanel: React.FC = observer(() => {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);

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

  const mergedContent = useMemo((): string => {
    if (selectedStatements.length === 0) return '';
    return writeMT940(selectedStatements);
  }, [selectedStatements]);

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

  const downloadMerged = () => {
    if (!mergedContent) return;
    const blob = new Blob([mergedContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'merged-statements.mt940';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (statementItems.length === 0) {
    return null;
  }

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

      {selectedIds.size > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {t('merge.selected', { count: selectedIds.size })}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPreview(true)}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
              >
                <Eye className="h-3 w-3 mr-1" />
                {t('merge.preview')}
              </button>
              <button
                onClick={downloadMerged}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Download className="h-3 w-3 mr-1" />
                {t('merge.download')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPreview && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                {t('merge.previewTitle')}
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
                {mergedContent}
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
                onClick={() => { downloadMerged(); setShowPreview(false); }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
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
