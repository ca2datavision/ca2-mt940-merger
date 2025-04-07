import React from 'react';
import { observer } from 'mobx-react-lite';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fileStore } from '../stores/FileStore';

export const PreviewModal = observer(() => {
  const { t } = useTranslation();
  const file = fileStore.selectedFile;

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    try {
      const [year, month, day] = dateStr.split('-');
      return `${day}.${month}.${year}`;
    } catch {
      return dateStr;
    }
  };

  if (!file?.parsed) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">{file.name}</h2>
          <button
            onClick={() => fileStore.setSelectedFile(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="overflow-auto flex-1 p-4">
          {file.parsed.statements.map((statement: any, statementIndex: number) => (
            <div key={statementIndex} className="mb-8">
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h3 className="font-semibold text-gray-700 mb-2">Statement Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Account</p>
                    <p className="font-medium">{statement.accountId || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {statement.transactions.map((transaction: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(transaction.entryDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.amount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.currency || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.transactionType}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-md break-words">
                            {transaction.extraDetails?.name || '-'}
                            {transaction.description && (
                              <span className="block text-gray-500 mt-1">{transaction.description}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.balance?.amount || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});