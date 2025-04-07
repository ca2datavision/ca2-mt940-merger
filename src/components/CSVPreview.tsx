import React from 'react';
import { observer } from 'mobx-react-lite';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fileStore } from '../stores/FileStore';

export const CSVPreview = observer(() => {
  const { t } = useTranslation();
  const rows = fileStore.convertToCSV();

  if (rows.length === 0) return null;

  const headers = {
    numarCont: 'Account Number',
    dataProcesarii: 'Date',
    suma: 'Amount',
    valuta: 'Currency',
    tipTranzactie: 'Transaction Type',
    numeContrapartida: 'Counterparty Name',
    adresaContrapartida: 'Counterparty Address',
    contContrapartida: 'Counterparty Account',
    bancaContrapartida: 'Counterparty Bank',
    detaliiTranzactie: 'Transaction Details',
    soldIntermediar: 'Balance',
    cuiContrapartida: 'Fiscal Code'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-white rounded-lg shadow-xl max-w-[90vw] w-full max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">CSV Preview</h2>
          <button
            onClick={() => fileStore.setShowCSVPreview(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="overflow-auto flex-1 p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {Object.values(headers).map((header, index) => (
                    <th
                      key={index}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    {Object.keys(headers).map((key, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap"
                      >
                        {row[key as keyof typeof row] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
});