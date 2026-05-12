import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { fileStore } from '../stores/FileStore';
import type { MT940Statement, MT940Transaction } from '../types/mt940';

interface TransactionTableProps {
  transactions: MT940Transaction[];
  formatDate: (dateStr: string | undefined) => string;
}

const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, formatDate }) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (index: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  if (!transactions || transactions.length === 0) {
    return <p className="text-gray-500 text-sm">No transactions</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-8"></th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Value Date</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Entry Date</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer Ref</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bank Ref</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {transactions.map((txn, idx) => {
            const isExpanded = expandedRows.has(idx);
            const hasDescription = txn.description && txn.description.trim().length > 0;
            return (
              <React.Fragment key={idx}>
                <tr className={hasDescription ? 'cursor-pointer hover:bg-gray-50' : ''} onClick={() => hasDescription && toggleRow(idx)}>
                  <td className="px-2 py-2 text-gray-400">
                    {hasDescription && (
                      isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(txn.valueDate)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(txn.entryDate)}</td>
                  <td className={`px-3 py-2 whitespace-nowrap text-right font-mono ${txn.isCredit ? 'text-green-600' : 'text-red-600'}`}>
                    {txn.isCredit ? '+' : '-'}{txn.amount?.toString() || '0.00'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{txn.transactionType || '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{txn.customerReference || '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{txn.bankReference || '-'}</td>
                </tr>
                {isExpanded && hasDescription && (
                  <tr className="bg-gray-50">
                    <td></td>
                    <td colSpan={6} className="px-3 py-2">
                      <div className="text-xs text-gray-600 whitespace-pre-wrap font-mono">{txn.description}</div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export const PreviewModal = observer(() => {
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
          {file.parsed.statements.map((statement: MT940Statement, statementIndex: number) => (
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

              <TransactionTable transactions={statement.transactions} formatDate={formatDate} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});