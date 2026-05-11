import React from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { FileText, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { fileStore } from '../stores/FileStore';

export const ReportPanel = observer(() => {
  const { t } = useTranslation();

  if (fileStore.files.length === 0) return null;

  const allIssues = [
    ...fileStore.batchIssues,
    ...fileStore.files.flatMap(f => f.validationIssues || [])
  ];

  const errorCount = allIssues.filter(i => i.severity === 'error').length;
  const warningCount = allIssues.filter(i => i.severity === 'warning').length;
  const warnings = allIssues.filter(i => i.severity === 'warning');

  const totalStatements = fileStore.files.reduce((sum, f) =>
    sum + (f.parsed?.statements.length || 0), 0);

  const totalTransactions = fileStore.files.reduce((sum, f) =>
    sum + (f.parsed?.statements.reduce((s, st) => s + st.transactions.length, 0) || 0), 0);

  const accounts = new Set<string>();
  const currencies = new Set<string>();
  fileStore.files.forEach(f => {
    f.parsed?.statements.forEach(st => {
      if (st.accountId) accounts.add(st.accountId);
      if (st.currency) currencies.add(st.currency);
    });
  });

  const { min, max } = fileStore.getTransactionDateRange();
  const canMerge = errorCount === 0;

  return (
    <div className="mt-6 bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 flex items-center mb-4">
        <FileText className="h-5 w-5 mr-2 text-indigo-600" />
        {t('report.title')}
      </h3>

      <div className="space-y-4">
        {/* Summary */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">{t('report.summary')}</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            <div><span className="text-gray-500">{t('validation.files')}:</span> {fileStore.files.length}</div>
            <div><span className="text-gray-500">{t('validation.statements')}:</span> {totalStatements}</div>
            <div><span className="text-gray-500">{t('validation.transactions')}:</span> {totalTransactions}</div>
            <div><span className="text-gray-500">{t('report.accounts')}:</span> {Array.from(accounts).join(', ') || 'N/A'}</div>
            <div><span className="text-gray-500">{t('report.currencies')}:</span> {Array.from(currencies).join(', ') || 'N/A'}</div>
            <div><span className="text-gray-500">{t('report.dateRange')}:</span> {min || 'N/A'} - {max || 'N/A'}</div>
          </div>
        </div>

        {/* Validation Result */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">{t('report.validationResult')}</h4>
          <div className="flex items-center">
            {errorCount > 0 ? (
              <span className="inline-flex items-center text-red-600">
                <XCircle className="h-4 w-4 mr-1" />
                {t('validation.status.invalid')} ({errorCount} {t('validation.errors')})
              </span>
            ) : warningCount > 0 ? (
              <span className="inline-flex items-center text-yellow-600">
                <AlertTriangle className="h-4 w-4 mr-1" />
                {t('validation.status.validWithWarnings')} ({warningCount} {t('validation.warnings')})
              </span>
            ) : (
              <span className="inline-flex items-center text-green-600">
                <CheckCircle className="h-4 w-4 mr-1" />
                {t('validation.status.valid')}
              </span>
            )}
          </div>
        </div>

        {/* Merge Assessment */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">{t('report.mergeAssessment')}</h4>
          <div className="flex items-center">
            {canMerge ? (
              <span className="inline-flex items-center text-green-600">
                <CheckCircle className="h-4 w-4 mr-1" />
                {t('report.mergeReady')}
              </span>
            ) : (
              <span className="inline-flex items-center text-red-600">
                <XCircle className="h-4 w-4 mr-1" />
                {t('report.mergeNotReady')}
              </span>
            )}
          </div>
        </div>

        {/* Warnings */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">{t('report.warningsSection')}</h4>
          {warnings.length > 0 ? (
            <ul className="text-sm text-yellow-700 list-disc pl-5 space-y-1">
              {warnings.slice(0, 5).map((w, idx) => (
                <li key={idx}>[{w.code}] {w.message}</li>
              ))}
              {warnings.length > 5 && (
                <li className="text-yellow-600">... and {warnings.length - 5} more</li>
              )}
            </ul>
          ) : (
            <span className="text-sm text-gray-500">{t('report.noWarnings')}</span>
          )}
        </div>
      </div>
    </div>
  );
});
