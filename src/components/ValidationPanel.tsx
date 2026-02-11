import { AlertCircle, AlertTriangle, Info, CheckCircle, Filter } from 'lucide-react';
import { useState } from 'react';
import { Severity } from '../engine/types';
import type { ValidationResult } from '../engine/types';

interface ValidationPanelProps {
  result: ValidationResult | undefined;
}

type SeverityFilter = Record<Severity, boolean>;

export function ValidationPanel({ result }: ValidationPanelProps) {
  const [filters, setFilters] = useState<SeverityFilter>({
    [Severity.ERROR]: true,
    [Severity.WARNING]: true,
    [Severity.INFO]: true,
  });

  if (!result) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        <div className="text-center">
          <Info className="w-12 h-12 mx-auto mb-2 text-zinc-600" />
          <p>No validation results yet</p>
          <p className="text-sm mt-1">Click Validate to check your message</p>
        </div>
      </div>
    );
  }

  const { issues } = result;

  // Count issues by severity
  const errorCount = issues.filter((i) => i.severity === Severity.ERROR).length;
  const warningCount = issues.filter((i) => i.severity === Severity.WARNING).length;
  const infoCount = issues.filter((i) => i.severity === Severity.INFO).length;

  // Filter issues based on selected severities
  const filteredIssues = issues.filter((issue) => filters[issue.severity]);

  // Group issues by severity
  const errorIssues = filteredIssues.filter((i) => i.severity === Severity.ERROR);
  const warningIssues = filteredIssues.filter((i) => i.severity === Severity.WARNING);
  const infoIssues = filteredIssues.filter((i) => i.severity === Severity.INFO);

  const toggleFilter = (severity: Severity) => {
    setFilters((prev) => ({ ...prev, [severity]: !prev[severity] }));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Summary */}
      {errorCount === 0 ? (
        <div className="bg-green-900/20 border border-green-700 rounded p-4 m-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-green-400 font-medium">Validation Passed</span>
          </div>
          <p className="text-sm text-green-300/80 mt-1">No errors found in the message</p>
        </div>
      ) : (
        <div className="bg-red-900/20 border border-red-700 rounded p-4 m-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-400 font-medium">Validation Failed</span>
          </div>
          <div className="flex gap-4 text-sm">
            {errorCount > 0 && (
              <span className="text-red-400">
                {errorCount} {errorCount === 1 ? 'error' : 'errors'}
              </span>
            )}
            {warningCount > 0 && (
              <span className="text-amber-400">
                {warningCount} {warningCount === 1 ? 'warning' : 'warnings'}
              </span>
            )}
            {infoCount > 0 && (
              <span className="text-blue-400">
                {infoCount} {infoCount === 1 ? 'info' : 'infos'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Filter toggles */}
      {issues.length > 0 && (
        <div className="flex items-center gap-2 px-4 pb-2 border-b border-zinc-800">
          <Filter className="w-4 h-4 text-zinc-500" />
          <span className="text-sm text-zinc-500">Show:</span>
          <button
            onClick={() => {
              toggleFilter(Severity.ERROR);
            }}
            className={`text-sm px-2 py-1 rounded ${
              filters[Severity.ERROR]
                ? 'bg-red-900/30 text-red-400 border border-red-700'
                : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
            }`}
          >
            Errors ({String(errorCount)})
          </button>
          <button
            onClick={() => {
              toggleFilter(Severity.WARNING);
            }}
            className={`text-sm px-2 py-1 rounded ${
              filters[Severity.WARNING]
                ? 'bg-amber-900/30 text-amber-400 border border-amber-700'
                : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
            }`}
          >
            Warnings ({String(warningCount)})
          </button>
          <button
            onClick={() => {
              toggleFilter(Severity.INFO);
            }}
            className={`text-sm px-2 py-1 rounded ${
              filters[Severity.INFO]
                ? 'bg-blue-900/30 text-blue-400 border border-blue-700'
                : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
            }`}
          >
            Info ({String(infoCount)})
          </button>
        </div>
      )}

      {/* Issues list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredIssues.length === 0 && issues.length > 0 ? (
          <div className="text-center text-zinc-500 py-8">
            <p>All issues are filtered out</p>
            <p className="text-sm mt-1">Enable filters above to see issues</p>
          </div>
        ) : (
          <>
            {/* Errors first */}
            {errorIssues.map((issue, idx) => (
              <IssueCard key={`error-${String(idx)}`} issue={issue} />
            ))}

            {/* Then warnings */}
            {warningIssues.map((issue, idx) => (
              <IssueCard key={`warning-${String(idx)}`} issue={issue} />
            ))}

            {/* Then info */}
            {infoIssues.map((issue, idx) => (
              <IssueCard key={`info-${String(idx)}`} issue={issue} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

interface IssueCardProps {
  issue: {
    id?: string | undefined;
    severity: Severity;
    field_path: string;
    message: string;
    suggestion?: string | undefined;
  };
}

function IssueCard({ issue }: IssueCardProps) {
  const severityConfig: Record<
    Severity,
    {
      icon: typeof AlertCircle;
      color: string;
      bgColor: string;
      borderColor: string;
    }
  > = {
    [Severity.ERROR]: {
      icon: AlertCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-900/20',
      borderColor: 'border-red-700',
    },
    [Severity.WARNING]: {
      icon: AlertTriangle,
      color: 'text-amber-400',
      bgColor: 'bg-amber-900/20',
      borderColor: 'border-amber-700',
    },
    [Severity.INFO]: {
      icon: Info,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
      borderColor: 'border-blue-700',
    },
  };

  const config = severityConfig[issue.severity];
  const Icon = config.icon;

  return (
    <div className={`${config.bgColor} border ${config.borderColor} rounded p-3`}>
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 ${config.color} mt-0.5 flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className={`text-xs font-mono ${config.color}`}>{issue.field_path}</span>
            {issue.id && <span className="text-xs text-zinc-500">({issue.id})</span>}
          </div>
          <p className="text-sm text-zinc-300 mt-1">{issue.message}</p>
          {issue.suggestion && (
            <p className="text-xs text-zinc-400 mt-1 italic">💡 {issue.suggestion}</p>
          )}
        </div>
      </div>
    </div>
  );
}
