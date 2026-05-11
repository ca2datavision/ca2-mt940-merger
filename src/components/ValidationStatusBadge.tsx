import React from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { fileStore } from '../stores/FileStore';

export const ValidationStatusBadge = observer(() => {
  const { t } = useTranslation();

  if (fileStore.files.length === 0) return null;

  const allIssues = [
    ...fileStore.batchIssues,
    ...fileStore.files.flatMap(f => f.validationIssues || [])
  ];

  const errorCount = allIssues.filter(i => i.severity === 'error').length;
  const warningCount = allIssues.filter(i => i.severity === 'warning').length;

  if (errorCount > 0) {
    return (
      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
        <XCircle className="h-4 w-4 mr-1.5" />
        {t('validation.status.invalid')}
        <span className="ml-2 text-red-600">({errorCount} {t('validation.errors')})</span>
      </div>
    );
  }

  if (warningCount > 0) {
    return (
      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
        <AlertTriangle className="h-4 w-4 mr-1.5" />
        {t('validation.status.validWithWarnings')}
        <span className="ml-2 text-yellow-600">({warningCount} {t('validation.warnings')})</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
      <CheckCircle className="h-4 w-4 mr-1.5" />
      {t('validation.status.valid')}
    </div>
  );
});
