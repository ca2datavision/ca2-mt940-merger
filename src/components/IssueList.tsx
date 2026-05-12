import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, AlertCircle, Info, Filter } from 'lucide-react';
import type { ValidationIssue, IssueSeverity } from '../types/validation';

interface IssueListProps {
  issues: ValidationIssue[];
}

const severityConfig: Record<IssueSeverity, { icon: typeof AlertTriangle; color: string; bg: string }> = {
  error: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  warning: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50' },
};

export const IssueList: React.FC<IssueListProps> = ({ issues }) => {
  const { t } = useTranslation();
  const [activeFilters, setActiveFilters] = useState<Set<IssueSeverity>>(
    new Set(['error', 'warning', 'info'])
  );

  const counts = {
    error: issues.filter(i => i.severity === 'error').length,
    warning: issues.filter(i => i.severity === 'warning').length,
    info: issues.filter(i => i.severity === 'info').length,
  };

  const toggleFilter = (severity: IssueSeverity) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(severity)) {
        next.delete(severity);
      } else {
        next.add(severity);
      }
      return next;
    });
  };

  const filteredIssues = issues.filter(i => activeFilters.has(i.severity));

  if (issues.length === 0) return null;

  return (
    <div className="mt-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <Filter className="h-4 w-4" />
            {t('issues.title', { count: issues.length })}
          </h3>
          <div className="flex gap-2">
            {(['error', 'warning', 'info'] as IssueSeverity[]).map(severity => {
              const config = severityConfig[severity];
              const Icon = config.icon;
              const isActive = activeFilters.has(severity);
              const count = counts[severity];
              if (count === 0) return null;
              return (
                <button
                  key={severity}
                  onClick={() => toggleFilter(severity)}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full transition-colors ${
                    isActive
                      ? `${config.bg} ${config.color} ring-1 ring-current`
                      : 'bg-gray-100 text-gray-400'
                  }`}
                  title={t(`issues.filter.${severity}`)}
                >
                  <Icon className="h-3 w-3" />
                  {count}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <ul className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
        {filteredIssues.map((issue, idx) => {
          const config = severityConfig[issue.severity];
          const Icon = config.icon;
          return (
            <li key={idx} className={`px-4 py-3 ${config.bg}`}>
              <div className="flex items-start gap-3">
                <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${config.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <span className={`font-mono px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}>
                      {issue.code}
                    </span>
                    {issue.fileName && (
                      <span className="truncate">
                        {issue.fileName}
                        {issue.lineNumber && `:${issue.lineNumber}`}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">
                    {t(`validationCodes.${issue.code}`, { defaultValue: issue.message })}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {filteredIssues.length === 0 && (
        <div className="px-4 py-6 text-center text-sm text-gray-500">
          {t('issues.noMatchingFilters')}
        </div>
      )}
    </div>
  );
};
