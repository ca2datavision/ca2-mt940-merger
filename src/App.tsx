import React from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { FileText, Share2, Github, Mail, Upload, X, Download, Eye } from 'lucide-react';
import { fileStore } from './stores/FileStore';
import { PreviewModal } from './components/PreviewModal';
import './i18n';

const App = observer(() => {
  const { t } = useTranslation();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    try {
      for (const file of Array.from(files)) {
        await fileStore.addFile(file);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to process file');
    }
  };

  const handleShare = () => {
    navigator.share({
      title: t('appTitle'),
      url: window.location.href
    }).catch(() => {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    });
  };

  const downloadCSV = () => {
    const rows = fileStore.convertToCSV();
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
    link.download = 'converted_mt940.csv';
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-8 w-8 text-indigo-600" />
              {t('appTitle')}
            </h1>
            <button
              onClick={handleShare}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-600">{t('privacy')}</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* File Upload Zone */}
        <div className="mt-8">
          <label
            htmlFor="file-upload"
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

            {/* Download Button */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={downloadCSV}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Download className="h-4 w-4 mr-2" />
                {t('download')}
              </button>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {fileStore.selectedFile && <PreviewModal />}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <a
                href="https://github.com/archeus/mt940-merger"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-500"
              >
                <Github className="h-6 w-6" />
              </a>
              <span className="text-sm text-gray-500">{t('footer.opensource')}</span>
              <span className="text-sm text-gray-500">•</span>
              <span className="text-sm text-gray-500">{t('footer.ai')}</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">{t('footer.company')}</span>
              <a
                href="mailto:ionut@ca2datavision.ro"
                className="text-gray-400 hover:text-gray-500"
              >
                <Mail className="h-6 w-6" />
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
});

export default App;
