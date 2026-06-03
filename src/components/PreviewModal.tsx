import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { fileStore } from '../stores/FileStore';
import { parseDescriptionWithPrefix } from '../utils/beneficiaryConsolidation';
import { getSubfieldDefinition, getTransactionTypeName, type Locale } from '../utils/mt940Tags';
import type { MT940Statement, MT940Transaction } from '../types/mt940';

interface SubfieldBreakdownProps {
  description: string;
  locale: Locale;
  t: (key: string) => string;
}

const SubfieldBreakdown: React.FC<SubfieldBreakdownProps> = ({ description, locale, t }) => {
  const { prefix, subfields } = parseDescriptionWithPrefix(description);

  if (subfields.length === 0) {
    return <div className="text-xs text-gray-600 whitespace-pre-wrap font-mono">{description}</div>;
  }

  return (
    <div className="space-y-1">
      {prefix && (
        <div className="flex text-xs">
          <span className="text-gray-400 font-mono w-12 flex-shrink-0">{t('previewModal.prefix')}</span>
          <span className="text-gray-500 w-36 flex-shrink-0"></span>
          <span className="text-gray-600 font-mono">{prefix}</span>
        </div>
      )}
      {subfields.map((sf, idx) => {
        const def = getSubfieldDefinition(sf.code, locale);
        return (
          <div key={idx} className="flex text-xs">
            <span
              className="text-blue-600 font-mono w-12 flex-shrink-0"
              title={def?.description}
            >
              {sf.code}
            </span>
            <span className="text-gray-500 w-36 flex-shrink-0">{def?.name || t('previewModal.unknown')}:</span>
            <span className="text-gray-800 break-all">{sf.value}</span>
          </div>
        );
      })}
    </div>
  );
};

interface TransactionTableProps {
  transactions: MT940Transaction[];
  formatDate: (dateStr: string | undefined) => string;
  t: (key: string) => string;
  locale: Locale;
}

const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, formatDate, t, locale }) => {
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
    return <p className="text-gray-500 text-sm">{t('previewModal.noTransactions')}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-8"></th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-help" title={t('previewModal.tooltip.valueDate')}>{t('previewModal.valueDate')}</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-help" title={t('previewModal.tooltip.entryDate')}>{t('previewModal.entryDate')}</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-help" title={t('previewModal.tooltip.amount')}>{t('previewModal.amount')}</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-help" title={t('previewModal.tooltip.type')}>{t('previewModal.type')}</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-help" title={t('previewModal.tooltip.customerRef')}>{t('previewModal.customerRef')}</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-help" title={t('previewModal.tooltip.bankRef')}>{t('previewModal.bankRef')}</th>
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
                  <td className="px-3 py-2 whitespace-nowrap" title={txn.transactionType ? getTransactionTypeName(txn.transactionType, locale) : undefined}>{txn.transactionType || '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{txn.customerReference || '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{txn.bankReference || '-'}</td>
                </tr>
                {isExpanded && (
                  <tr className="bg-gray-50">
                    <td></td>
                    <td colSpan={6} className="px-3 py-2">
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs font-medium text-gray-700 mb-1">{t('previewModal.rawDescription')}</div>
                          <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-white p-2 rounded border max-h-48 overflow-y-auto">{txn.description}</pre>
                        </div>
                        {parseDescriptionWithPrefix(txn.description).subfields.length > 0 && (
                          <div>
                            <div className="text-xs font-medium text-gray-700 mb-1">{t('previewModal.explained')}</div>
                            <SubfieldBreakdown description={txn.description} locale={locale} t={t} />
                          </div>
                        )}
                      </div>
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
  const { t, i18n } = useTranslation();
  const locale = (i18n.language?.substring(0, 2) === 'ro' ? 'ro' : 'en') as Locale;
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
                <h3 className="font-semibold text-gray-700 mb-2">{t('previewModal.statement')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">{t('previewModal.account')}</p>
                    <p className="font-medium">{statement.accountId || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('previewModal.currency')}</p>
                    <p className="font-medium">{statement.openingBalance?.currency || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('previewModal.openingBalance')}</p>
                    <p className={`font-medium font-mono ${statement.openingBalance?.isCredit ? 'text-green-600' : 'text-red-600'}`}>
                      {statement.openingBalance ? `${statement.openingBalance.isCredit ? '+' : '-'}${statement.openingBalance.value}` : '-'}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(statement.openingBalance?.date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('previewModal.closingBalance')}</p>
                    <p className={`font-medium font-mono ${statement.closingBalance?.isCredit ? 'text-green-600' : 'text-red-600'}`}>
                      {statement.closingBalance ? `${statement.closingBalance.isCredit ? '+' : '-'}${statement.closingBalance.value}` : '-'}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(statement.closingBalance?.date)}</p>
                  </div>
                </div>
              </div>

              <TransactionTable transactions={statement.transactions} formatDate={formatDate} t={t} locale={locale} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});