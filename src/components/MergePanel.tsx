import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Download, Eye, X, CheckSquare, Square, AlertCircle, FileStack, FileText, Table, FileDown, ChevronDown, ChevronRight, FileJson, Users } from 'lucide-react';
import { DEFAULT_CONSOLIDATION_OPTIONS, type ConsolidationOptions } from '../utils/beneficiaryConsolidation';
import { fileStore } from '../stores/FileStore';
import { writeMT940, convertParsedToWritable } from '../utils/mt940Writer';
import { buildValidationResult, validationResultToJSON, generateValidationReport, downloadFile } from '../utils/exportValidation';
import { analyzeMergeEligibility } from '../validation/merge';
import { mergeSingleStatement as mergeSingleStatementModule } from '../merge/singleStatement';
import { toCSV, ENHANCED_HEADERS } from '../utils/csv';
import { sanitizeFilename } from '../utils/filename';
import type { MT940Statement } from '../utils/mt940Writer';
import type { ValidationIssue, Statement } from '../types/validation';

interface StatementItem {
  id: string;
  fileId: string;
  fileName: string;
  accountId: string;
  statementNumber: string;
  date: string;
  transactionCount: number;
  statement: MT940Statement;
  validationStatement: Statement;
}

export const MergePanel: React.FC = observer(() => {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<'multi' | 'single'>('multi');
  const [showSingleConfirm, setShowSingleConfirm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [consolidationEnabled, setConsolidationEnabled] = useState(DEFAULT_CONSOLIDATION_OPTIONS.enabled);
  const [consolidationKeyword, setConsolidationKeyword] = useState(DEFAULT_CONSOLIDATION_OPTIONS.keyword);
  const prevItemCountRef = useRef(0);

  const consolidationOptions: ConsolidationOptions = useMemo(() => ({
    enabled: consolidationEnabled,
    keyword: consolidationKeyword.trim(),
  }), [consolidationEnabled, consolidationKeyword]);

  const allIssues = useMemo((): ValidationIssue[] => {
    const issues: ValidationIssue[] = [...fileStore.batchIssues];
    for (const file of fileStore.files) {
      if (file.validationIssues) {
        issues.push(...file.validationIssues);
      }
    }
    return issues;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileStore.batchIssues.length, fileStore.files.length]);

  const statementItems = useMemo((): StatementItem[] => {
    const items: StatementItem[] = [];
    for (const file of fileStore.files) {
      if (!file.parsed?.statements || !file.statements) continue;
      const writableStatements = convertParsedToWritable(file.parsed);

      file.parsed.statements.forEach((stmt, idx) => {
        const writable = writableStatements[idx];
        const validationStmt = file.statements?.[idx];
        if (!writable || !validationStmt) return;

        items.push({
          id: `${file.id}-${idx}`,
          fileId: file.id,
          fileName: file.name,
          accountId: stmt.accountId || 'Unknown',
          statementNumber: stmt.number || String(idx + 1),
          date: stmt.openingBalance?.date || '',
          transactionCount: stmt.transactions?.length || 0,
          statement: writable,
          validationStatement: validationStmt,
        });
      });
    }
    return items;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileStore.files.length]);

  // Auto-select all items when files are added; preserve selection when files removed
  useEffect(() => {
    const prevCount = prevItemCountRef.current;
    const currentCount = statementItems.length;

    if (currentCount > prevCount) {
      // Files added: select all items (including new ones)
      setSelectedIds(new Set(statementItems.map(item => item.id)));
    } else if (currentCount < prevCount) {
      // Files removed: keep selection but filter out removed items
      const validIds = new Set(statementItems.map(item => item.id));
      setSelectedIds(prev => new Set([...prev].filter(id => validIds.has(id))));
    }

    prevItemCountRef.current = currentCount;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statementItems.length]);

  const selectedItems = useMemo(() => {
    return statementItems.filter(item => selectedIds.has(item.id));
  }, [statementItems, selectedIds]);

  const selectedStatements = useMemo((): MT940Statement[] => {
    return selectedItems.map(item => item.statement);
  }, [selectedItems]);

  const selectedValidationStatements = useMemo((): Statement[] => {
    return selectedItems.map(item => item.validationStatement);
  }, [selectedItems]);

  const selectedFileIds = useMemo((): Set<string> => {
    return new Set(selectedItems.map(item => item.fileId));
  }, [selectedItems]);

  const selectedIssues = useMemo((): ValidationIssue[] => {
    return allIssues.filter(issue => !issue.fileId || selectedFileIds.has(issue.fileId));
  }, [allIssues, selectedFileIds]);

  const selectionEligibility = useMemo(() => {
    if (selectedValidationStatements.length === 0) {
      return { multiMessage: { eligible: true, blockers: [] }, singleStatement: { eligible: true, blockers: [] } };
    }
    return analyzeMergeEligibility(selectedValidationStatements, selectedIssues);
  }, [selectedValidationStatements, selectedIssues]);

  const errorCount = selectionEligibility.multiMessage.blockers.length;

  const multiMessageContent = useMemo((): string => {
    if (selectedStatements.length === 0) return '';
    return writeMT940(selectedStatements, { consolidationOptions });
  }, [selectedStatements, consolidationOptions]);

  const singleStatementContent = useMemo((): string => {
    if (selectedValidationStatements.length === 0) return '';
    const merged = mergeSingleStatementModule(selectedValidationStatements);
    return writeMT940([{
      accountId: merged.accountId,
      statementNumber: merged.statementNumber,
      sequenceNumber: merged.sequenceNumber,
      transactionReference: merged.transactionReference,
      openingBalance: {
        isCredit: merged.openingBalance.isCredit,
        date: merged.openingBalance.date,
        currency: merged.openingBalance.currency,
        amount: merged.openingBalance.amount.toString(),
      },
      closingBalance: {
        isCredit: merged.closingBalance.isCredit,
        date: merged.closingBalance.date,
        currency: merged.closingBalance.currency,
        amount: merged.closingBalance.amount.toString(),
      },
      sourceStatementNumbers: merged.sourceStatementNumbers,
      transactions: merged.transactions.map(t => ({
        valueDate: t.valueDate,
        entryDate: t.entryDate,
        isCredit: t.isCredit,
        amount: t.amount.toString(),
        transactionType: t.transactionType,
        reference: t.customerReference,
        description: t.description,
        supplementaryDetails: t.supplementaryDetails,
      })),
    }], { consolidationOptions });
  }, [selectedValidationStatements, consolidationOptions]);

  const previewContent = previewMode === 'multi' ? multiMessageContent : singleStatementContent;

  const canMergeMulti = selectedIds.size > 0 && selectionEligibility.multiMessage.eligible;
  const canMergeSingle = selectedIds.size > 0 && selectionEligibility.singleStatement.eligible;

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

  const promptSingleDownload = () => {
    if (!canMergeSingle) return;
    setShowSingleConfirm(true);
  };

  const confirmSingleDownload = () => {
    setShowSingleConfirm(false);
    downloadSingle();
  };

  const openPreview = (mode: 'multi' | 'single') => {
    setPreviewMode(mode);
    setShowPreview(true);
  };

  const downloadCSV = useCallback(() => {
    const rows = fileStore.convertToCSV(consolidationOptions);
    const { min, max } = fileStore.getTransactionDateRange();
    const accountId = fileStore.getFirstAccountId();
    const accountSuffix = accountId ? `_${sanitizeFilename(accountId)}` : '';
    const filename = min === max ?
      `transactions${accountSuffix}_${min}` :
      `transactions${accountSuffix}_${min}_to_${max}`;

    const headers = [
      'numar cont', 'data procesarii', 'suma', 'valuta',
      'tip tranzactie', 'nume beneficiar/ordonator',
      'adresa beneficiar/ordonator', 'cont beneficiar/ordonator',
      'banca beneficiar/ordonator', 'detalii tranzactie',
      'sold intermediar', 'CUI Contrapartida'
    ];

    const csvContent = toCSV(headers, rows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [consolidationOptions]);

  const downloadEnhancedCSV = useCallback(() => {
    const rows = fileStore.convertToEnhancedCSV(consolidationOptions);
    const { min, max } = fileStore.getTransactionDateRange();
    const accountId = fileStore.getFirstAccountId();
    const accountSuffix = accountId ? `_${sanitizeFilename(accountId)}` : '';
    const filename = min === max ?
      `transactions_enhanced${accountSuffix}_${min}` :
      `transactions_enhanced${accountSuffix}_${min}_to_${max}`;

    const csvContent = toCSV(ENHANCED_HEADERS, rows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [consolidationOptions]);

  const downloadValidationJSON = useCallback(() => {
    const result = buildValidationResult(fileStore.files, fileStore.batchIssues);
    const json = validationResultToJSON(result);
    downloadFile(json, 'validation-result.json', 'application/json');
  }, []);

  const downloadValidationReport = useCallback(() => {
    const result = buildValidationResult(fileStore.files, fileStore.batchIssues);
    const report = generateValidationReport(result);
    downloadFile(report, 'validation-report.md', 'text/markdown');
  }, []);

  if (statementItems.length === 0) {
    return null;
  }

  const multiDisabledReason = !selectionEligibility.multiMessage.eligible
    ? selectionEligibility.multiMessage.reason || t('merge.disabledErrors', { count: errorCount })
    : selectedIds.size === 0
    ? t('merge.disabledNoSelection')
    : null;

  const singleDisabledReason = !selectionEligibility.singleStatement.eligible
    ? selectionEligibility.singleStatement.reason || t('merge.disabledErrors', { count: errorCount })
    : selectedIds.size === 0
    ? t('merge.disabledNoSelection')
    : null;

  const disabledReason = multiDisabledReason || singleDisabledReason;

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

        {/* Side-by-Side Export Layout */}
        <div className="grid grid-cols-2 gap-4">
          {/* Left: CSV Export */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
              <Table className="h-3 w-3" />
              {t('merge.csvMode', { defaultValue: 'CSV Export' })}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={downloadCSV}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700"
                title={t('merge.csvBasicTooltip', { defaultValue: 'Download basic CSV with essential fields' })}
              >
                <Download className="h-3 w-3 mr-1" />
                {t('merge.downloadCsv', { defaultValue: 'Download CSV' })}
              </button>
              <button
                onClick={downloadEnhancedCSV}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                title={t('merge.csvEnhancedTooltip', { defaultValue: 'Download enhanced CSV with all 19 fields including fingerprints' })}
              >
                <FileDown className="h-3 w-3 mr-1" />
                {t('merge.downloadEnhancedCsv', { defaultValue: 'Enhanced CSV' })}
              </button>
              <button
                onClick={() => fileStore.setShowCSVPreview(true)}
                className="inline-flex items-center px-2 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-500 bg-white hover:bg-gray-50"
                title={t('merge.previewCsv', { defaultValue: 'Preview CSV data' })}
              >
                <Eye className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Right: MT940 Merge */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
              <FileStack className="h-3 w-3" />
              {t('merge.mt940Mode', { defaultValue: 'MT940 Merge' })}
            </div>
            {disabledReason && (
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-2 py-1.5 rounded">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{disabledReason}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={promptSingleDownload}
                disabled={!canMergeSingle}
                className={`inline-flex items-center px-3 py-1.5 border text-xs font-medium rounded ${
                  canMergeSingle
                    ? 'border-transparent text-white bg-indigo-600 hover:bg-indigo-700'
                    : 'border-gray-200 text-gray-400 bg-gray-300 cursor-not-allowed'
                }`}
                title={singleDisabledReason || t('merge.singleTooltip', { defaultValue: 'Merge all into one consolidated statement (recalculates balances)' })}
              >
                <FileText className="h-3 w-3 mr-1" />
                {t('merge.downloadSingle')}
              </button>
              <button
                onClick={downloadMulti}
                disabled={!canMergeMulti}
                className={`inline-flex items-center px-3 py-1.5 border text-xs font-medium rounded ${
                  canMergeMulti
                    ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                    : 'border-gray-200 text-gray-400 bg-gray-100 cursor-not-allowed'
                }`}
                title={disabledReason || t('merge.multiTooltip', { defaultValue: 'Download combined MT940 preserving original statement structure' })}
              >
                <FileStack className="h-3 w-3 mr-1" />
                {t('merge.downloadMulti')}
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Advanced Section */}
        <div className="mt-3 border-t border-gray-200 pt-3">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            {showAdvanced ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {t('merge.advancedOptions', { defaultValue: 'Advanced Options' })}
          </button>
          {showAdvanced && (
            <>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => openPreview('single')}
                disabled={!canMergeSingle}
                className={`inline-flex items-center px-2 py-1.5 border text-xs font-medium rounded ${
                  canMergeSingle
                    ? 'border-gray-300 text-gray-500 bg-white hover:bg-gray-50'
                    : 'border-gray-200 text-gray-400 bg-gray-100 cursor-not-allowed'
                }`}
                title={t('merge.previewSingle')}
              >
                <Eye className="h-3 w-3 mr-1" />
                {t('merge.previewSingleLabel', { defaultValue: 'Preview Single' })}
              </button>
              <button
                onClick={() => openPreview('multi')}
                disabled={!canMergeMulti}
                className={`inline-flex items-center px-2 py-1.5 border text-xs font-medium rounded ${
                  canMergeMulti
                    ? 'border-gray-300 text-gray-500 bg-white hover:bg-gray-50'
                    : 'border-gray-200 text-gray-400 bg-gray-100 cursor-not-allowed'
                }`}
                title={t('merge.previewMulti')}
              >
                <Eye className="h-3 w-3 mr-1" />
                {t('merge.previewMultiLabel', { defaultValue: 'Preview Multi' })}
              </button>
              <button
                onClick={downloadValidationJSON}
                className="inline-flex items-center px-2 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-500 bg-white hover:bg-gray-50"
                title={t('downloads.jsonTitle', { defaultValue: 'Download validation result as JSON' })}
              >
                <FileJson className="h-3 w-3 mr-1" />
                {t('downloads.json', { defaultValue: 'JSON' })}
              </button>
              <button
                onClick={downloadValidationReport}
                className="inline-flex items-center px-2 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-500 bg-white hover:bg-gray-50"
                title={t('downloads.reportTitle', { defaultValue: 'Download validation report' })}
              >
                <FileText className="h-3 w-3 mr-1" />
                {t('downloads.report', { defaultValue: 'Report' })}
              </button>
            </div>

            {/* Beneficiary Consolidation Options */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consolidationEnabled}
                  onChange={(e) => setConsolidationEnabled(e.target.checked)}
                  className="h-3.5 w-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <Users className="h-3 w-3 text-gray-400" />
                {t('merge.consolidateBeneficiaries', { defaultValue: 'Consolidate beneficiaries by keyword' })}
              </label>
              {consolidationEnabled && (
                <div className="mt-2 ml-5">
                  <input
                    type="text"
                    value={consolidationKeyword}
                    onChange={(e) => setConsolidationKeyword(e.target.value)}
                    placeholder={t('merge.consolidationKeywordPlaceholder', { defaultValue: 'e.g., PLATA ZILIER' })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    {t('merge.consolidationHelp', { defaultValue: 'Transactions containing this keyword will be grouped under a single beneficiary name' })}
                  </p>
                </div>
              )}
            </div>
            </>
          )}
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

      {showSingleConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                {t('merge.singleConfirmTitle')}
              </h3>
              <button
                onClick={() => setShowSingleConfirm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600">
                  {t('merge.singleConfirmMessage')}
                </p>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowSingleConfirm(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                {t('cancel')}
              </button>
              <button
                onClick={confirmSingleDownload}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700"
              >
                <Download className="h-4 w-4 mr-2" />
                {t('merge.confirmDownload')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
