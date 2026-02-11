import { AlertTriangle, ArrowRight, Copy, ArrowLeftRight } from 'lucide-react';
import { MessageFormat, DataLossCategory } from '../engine/types';
import type { TranslationResult } from '../engine/types';
import { Editor } from './Editor';

interface TranslationPanelProps {
  result: TranslationResult | undefined;
  onCopyOutput?: () => void;
  onSwapInputOutput?: () => void;
}

export function TranslationPanel({ result, onCopyOutput, onSwapInputOutput }: TranslationPanelProps) {
  if (!result) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        <div className="text-center">
          <ArrowRight className="w-12 h-12 mx-auto mb-2 text-zinc-600" />
          <p>No translation results yet</p>
          <p className="text-sm mt-1">Click Translate to convert your message</p>
        </div>
      </div>
    );
  }

  const { translatedMessage, sourceType, targetType, warnings } = result;

  // Determine output language for syntax highlighting
  const outputLanguage = result.targetFormat === MessageFormat.MX ? 'xml' : 'mt';

  // Get readable message type names
  const getMessageTypeName = (type: string): string => {
    if (type.startsWith('pacs.') || type.startsWith('camt.')) {
      return type;
    }
    return type; // MT103, MT202, etc.
  };

  const sourceTypeName = getMessageTypeName(sourceType);
  const targetTypeName = getMessageTypeName(targetType);

  return (
    <div className="h-full flex flex-col">
      {/* Translation direction header */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono text-purple-400">{sourceTypeName}</span>
            <ArrowRight className="w-4 h-4 text-zinc-500" />
            <span className="font-mono text-purple-400">{targetTypeName}</span>
          </div>
          <div className="flex gap-2">
            {onSwapInputOutput && (
              <button
                onClick={onSwapInputOutput}
                className="text-xs px-3 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700 flex items-center gap-1"
                title="Swap input and output (reverse translation)"
              >
                <ArrowLeftRight className="w-3 h-3" />
                Swap
              </button>
            )}
            {onCopyOutput && (
              <button
                onClick={onCopyOutput}
                className="text-xs px-3 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700 flex items-center gap-1"
                title="Copy translated message to clipboard"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Translated message output */}
      <div className="flex-1 overflow-hidden border-b border-zinc-800">
        <Editor
          value={translatedMessage}
          onChange={() => {}}
          language={outputLanguage}
          readOnly={true}
          placeholder="Translated message will appear here..."
        />
      </div>

      {/* Data loss warnings */}
      {warnings.length > 0 && (
        <div className="overflow-y-auto p-4 space-y-2 bg-zinc-950">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-400">
              Data Loss Warnings ({String(warnings.length)})
            </span>
          </div>
          <div className="space-y-2">
            {warnings.map((warning, idx) => (
              <WarningCard key={String(idx)} warning={warning} />
            ))}
          </div>
        </div>
      )}

      {/* Success message when no warnings */}
      {warnings.length === 0 && (
        <div className="p-4 bg-green-900/20 border-t border-green-700">
          <p className="text-sm text-green-400">
            Translation completed successfully with no data loss warnings
          </p>
        </div>
      )}
    </div>
  );
}

interface WarningCardProps {
  warning: {
    field_path: string;
    category: DataLossCategory;
    description: string;
  };
}

function WarningCard({ warning }: WarningCardProps) {
  const categoryConfig: Record<
    DataLossCategory,
    {
      label: string;
      color: string;
      bgColor: string;
    }
  > = {
    [DataLossCategory.TRUNCATION]: {
      label: 'Truncation',
      color: 'text-orange-400',
      bgColor: 'bg-orange-900/20',
    },
    [DataLossCategory.NO_EQUIVALENT]: {
      label: 'No Equivalent',
      color: 'text-amber-400',
      bgColor: 'bg-amber-900/20',
    },
    [DataLossCategory.PRECISION_LOSS]: {
      label: 'Precision Loss',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/20',
    },
    [DataLossCategory.OPTIONAL_FIELD]: {
      label: 'Optional Field',
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
    },
    [DataLossCategory.FORMAT_CHANGE]: {
      label: 'Format Change',
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20',
    },
  };

  const config = categoryConfig[warning.category];

  return (
    <div className={`${config.bgColor} border border-amber-700/50 rounded p-3`}>
      <div className="flex items-start gap-2">
        <AlertTriangle className={`w-4 h-4 ${config.color} mt-0.5 flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xs font-mono text-amber-400">{warning.field_path}</span>
            <span className={`text-xs font-medium ${config.color}`}>
              [{config.label}]
            </span>
          </div>
          <p className="text-sm text-zinc-300 mt-1">{warning.description}</p>
        </div>
      </div>
    </div>
  );
}
