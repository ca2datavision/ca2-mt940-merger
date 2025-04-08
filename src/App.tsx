import React, { useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { FileText, Github, Mail, Upload, X, Download, Eye, Linkedin, Twitter, Facebook, Copy, Check } from 'lucide-react';
import { fileStore } from './stores/FileStore';
import { PreviewModal } from './components/PreviewModal';
import { CSVPreview } from './components/CSVPreview';
import { LanguageSelector } from './components/LanguageSelector';
import { ConfirmationModal } from './components/ConfirmationModal';
import './i18n';

const App = observer(() => {
  const { t } = useTranslation();
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = window.location.href;
  const shareLinks = {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(t('appTitle'))}&summary=${encodeURIComponent(t('description'))}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(t('appTitle'))}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const files = event.target.files;
    if (!files) return;

    try {
      for (const file of Array.from(files)) {
        await fileStore.addFile(file);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to process file');
    }
  }, []);

  const handleDrop = useCallback(async (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (!files) return;

    try {
      for (const file of Array.from(files)) {
        await fileStore.addFile(file);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to process file');
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
  }, []);

  const downloadCSV = useCallback(() => {
    const rows = fileStore.convertToCSV();
    const { min, max } = fileStore.getTransactionDateRange();
    const accountId = fileStore.getFirstAccountId();
    const accountSuffix = accountId ? `_${accountId}` : '';
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

    const csvContent = [
      headers.join(','),
      ...rows.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  }, []);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-start">
            <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-8 w-8 text-indigo-600" />
              <div>
                {t('appTitle')}
                <p className="text-sm font-normal text-gray-600 mt-1">
                  {t('description')}
                </p>
              </div>
            </h1>
            </div>
            <LanguageSelector />
          </div>
          <p className="mt-2 text-sm text-gray-600">{t('privacy')}</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* File Upload Zone */}
        <div className="mt-8">
          <label
            htmlFor="file-upload"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="relative block w-full p-12 text-center border-2 border-gray-300 border-dashed rounded-lg hover:border-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 cursor-pointer"
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <span className="mt-2 block text-sm font-medium text-gray-900">
              {t('dropzone')}
            </span>
            <input
              id="file-upload"
              type="file"
              multiple
              onClick={(e) => (e.target as HTMLInputElement).value = ''}
              accept=".sta,.mt940,.mt,.txt"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>

        {/* File List */}
        {fileStore.files.length > 0 && (
          <div className="mt-8">
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {fileStore.files.map((file) => (
                  <li key={file.id}>
                    <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-3" />
                        <div className="text-sm font-medium text-indigo-600 truncate">
                          {file.name}
                        </div>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => fileStore.setSelectedFile(file.id)}
                          className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t('preview')}
                        </button>
                        <button
                          onClick={() => fileStore.removeFile(file.id)}
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <X className="h-4 w-4 mr-1" />
                          {t('removeFile')}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex justify-between items-center">
              <button
                onClick={() => setShowResetConfirmation(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <X className="h-4 w-4 mr-2" />
                {t('reset')}
              </button>
              <div className="flex space-x-4">
              <button
                onClick={() => fileStore.setShowCSVPreview(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview CSV
              </button>
              <button
                onClick={downloadCSV}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Download className="h-4 w-4 mr-2" />
                {t('download')}
              </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {fileStore.selectedFile && <PreviewModal />}

        {/* CSV Preview Modal */}
        {fileStore.showCSVPreview && <CSVPreview />}

        {/* Reset Confirmation Modal */}
        <ConfirmationModal
          isOpen={showResetConfirmation}
          onClose={() => setShowResetConfirmation(false)}
          onConfirm={fileStore.reset}
          title={t('resetTitle')}
          message={t('confirmReset')}
        />

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200">
          <div className="flex flex-col space-y-6 sm:space-y-4">
            <div className="flex justify-center space-x-6">
              <a
                href={shareLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-500"
                title="Share on LinkedIn"
              >
                <Linkedin className="h-6 w-6" />
              </a>
              <a
                href={shareLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-500"
                title="Share on Twitter"
              >
                <Twitter className="h-6 w-6" />
              </a>
              <a
                href={shareLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-500"
                title="Share on Facebook"
              >
                <Facebook className="h-6 w-6" />
              </a>
              <button
                onClick={handleCopy}
                className="text-gray-400 hover:text-gray-500"
                title="Copy link"
              >
                {copied ? (
                  <Check className="h-6 w-6 text-green-500" />
                ) : (
                  <Copy className="h-6 w-6" />
                )}
              </button>
            </div>
            <div className="flex flex-col sm:flex-row justify-center items-center sm:space-x-4 space-y-2 sm:space-y-0">
              <a
                className="flex items-center space-x-2 text-gray-500 hover:text-gray-700"
                href="https://github.com/ca2datavision/ca2-mt940-merger"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-6 w-6 text-gray-400" />
                <span>{t('footer.opensource')}</span>
              </a>
              <span className="text-sm text-gray-500 hidden sm:inline">•</span>
              <span className="text-sm text-gray-500">{t('footer.ai')}</span>
              <span className="text-sm text-gray-500 hidden sm:inline">•</span>
              <a
                href="mailto:ionut@ca2datavision.ro"
                className="flex items-center space-x-2 text-gray-500 hover:text-gray-700"
              >
                <span>{t('footer.company')}</span>
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
});

export default App;