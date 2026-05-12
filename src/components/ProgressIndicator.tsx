import React from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { X, Loader2 } from 'lucide-react';
import { fileStore } from '../stores/FileStore';

export const ProgressIndicator: React.FC = observer(() => {
  const { t } = useTranslation();

  if (!fileStore.isProcessing || !fileStore.progress) {
    return null;
  }

  const { current, total, currentFile } = fileStore.progress;
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            {t('progress.title')}
          </h3>
          <button
            onClick={() => fileStore.cancelProcessing()}
            className="text-gray-400 hover:text-gray-500 p-1 rounded-full hover:bg-gray-100"
            title={t('progress.cancel')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-2">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>{t('progress.processing', { current, total })}</span>
            <span>{percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {currentFile && (
          <p className="text-sm text-gray-500 truncate" title={currentFile}>
            {currentFile}
          </p>
        )}

        <button
          onClick={() => fileStore.cancelProcessing()}
          className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <X className="h-4 w-4 mr-2" />
          {t('progress.cancel')}
        </button>
      </div>
    </div>
  );
});
