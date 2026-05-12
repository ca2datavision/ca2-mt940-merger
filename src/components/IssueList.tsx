import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, AlertCircle, Info, Filter, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import type { ValidationIssue, IssueSeverity } from '../types/validation';

interface IssueListProps {
  issues: ValidationIssue[];
}

const severityConfig: Record<IssueSeverity, { icon: typeof AlertTriangle; color: string; bg: string }> = {
  error: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  warning: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50' },
};

interface IssueGroup {
  name: string;
  issues: ValidationIssue[];
}

export const IssueList: React.FC<IssueListProps> = ({ issues }) => {
  const { t } = useTranslation();
  const [activeFilters, setActiveFilters] = useState<Set<IssueSeverity>>(
    new Set(['error', 'warning', 'info'])
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

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

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const filteredIssues = issues.filter(i => activeFilters.has(i.severity));

  const groupedIssues = useMemo((): IssueGroup[] => {
    const groups = new Map<string, ValidationIssue[]>();

    for (const issue of filteredIssues) {
      const groupName = issue.fileName || 'Batch';
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      groups.get(groupName)!.push(issue);
    }

    const result: IssueGroup[] = [];
    if (groups.has('Batch')) {
      result.push({ name: 'Batch', issues: groups.get('Batch')! });
      groups.delete('Batch');
    }
    for (const [name, groupIssues] of groups) {
      result.push({ name, issues: groupIssues });
    }
    return result;
  }, [filteredIssues]);

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

      <div className="max-h-80 overflow-y-auto">
        {groupedIssues.map(group => {
          const isCollapsed = collapsedGroups.has(group.name);
          const groupErrorCount = group.issues.filter(i => i.severity === 'error').length;

          return (
            <div key={group.name} className="border-b border-gray-100 last:border-b-0">
              <button
                onClick={() => toggleGroup(group.name)}
                className="w-full px-4 py-2 flex items-center gap-2 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 truncate flex-1 text-left">
                  {group.name === 'Batch' ? t('issues.batchGroup', { defaultValue: 'Cross-file issues' }) : group.name}
                </span>
                <span className="text-xs text-gray-500">
                  {group.issues.length} {group.issues.length === 1 ? 'issue' : 'issues'}
                  {groupErrorCount > 0 && (
                    <span className="ml-1 text-red-600">({groupErrorCount} errors)</span>
                  )}
                </span>
              </button>

              {!isCollapsed && (
                <ul className="divide-y divide-gray-100">
                  {group.issues.map((issue, idx) => {
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
                              {issue.field && (
                                <span className="text-gray-400">{issue.field}</span>
                              )}
                              {issue.lineNumber && (
                                <span className="text-gray-400">line {issue.lineNumber}</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700">
                              {t(`validationCodes.${issue.code}`, { defaultValue: issue.message })}
                            </p>
                            {issue.suggestion && (
                              <p className="text-xs text-gray-500 mt-1 italic">
                                💡 {issue.suggestion}
                              </p>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {filteredIssues.length === 0 && (
        <div className="px-4 py-6 text-center text-sm text-gray-500">
          {t('issues.noMatchingFilters')}
        </div>
      )}
    </div>
  );
};
