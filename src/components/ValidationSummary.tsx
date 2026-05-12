import React from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { FileText, Layers, ArrowRightLeft, AlertTriangle, CheckCircle } from 'lucide-react';
import { fileStore } from '../stores/FileStore';

export const ValidationSummary = observer(() => {
  const { t } = useTranslation();

  if (fileStore.files.length === 0) return null;

  const totalStatements = fileStore.files.reduce((sum, f) =>
    sum + (f.parsed?.statements.length || 0), 0);

  const totalTransactions = fileStore.files.reduce((sum, f) =>
    sum + (f.parsed?.statements.reduce((s, st) => s + st.transactions.length, 0) || 0), 0);

  return (
    <div className="grid grid-cols-3 gap-4 mb-4">
      <div className="bg-white rounded-lg shadow p-4 flex items-center">
        <FileText className="h-8 w-8 text-indigo-500 mr-3" />
        <div>
          <div className="text-2xl font-bold text-gray-900">{fileStore.files.length}</div>
          <div className="text-sm text-gray-500">{t('validation.files')}</div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-4 flex items-center">
        <Layers className="h-8 w-8 text-indigo-500 mr-3" />
        <div>
          <div className="text-2xl font-bold text-gray-900">{totalStatements}</div>
          <div className="text-sm text-gray-500">{t('validation.statements')}</div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-4 flex items-center">
        <ArrowRightLeft className="h-8 w-8 text-indigo-500 mr-3" />
        <div>
          <div className="text-2xl font-bold text-gray-900">{totalTransactions}</div>
          <div className="text-sm text-gray-500">{t('validation.transactions')}</div>
        </div>
      </div>
    </div>
  );
});

export const FileValidationCard = observer(({ fileId }: { fileId: string }) => {
  const { t } = useTranslation();
  const file = fileStore.files.find(f => f.id === fileId);
  if (!file) return null;

  const issues = file.validationIssues || [];
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const statementCount = file.parsed?.statements.length || 0;

  return (
    <div className="flex items-center space-x-2">
      {errorCount > 0 ? (
        <span className="inline-flex items-center text-xs text-red-600">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {errorCount} {t('validation.errors')}
        </span>
      ) : warningCount > 0 ? (
        <span className="inline-flex items-center text-xs text-yellow-600">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {warningCount} {t('validation.warnings')}
        </span>
      ) : (
        <span className="inline-flex items-center text-xs text-green-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          {t('validation.noIssues')}
        </span>
      )}
      <span className="text-xs text-gray-400">•</span>
      <span className="text-xs text-gray-500">{statementCount} {t('validation.statements').toLowerCase()}</span>
    </div>
  );
});
