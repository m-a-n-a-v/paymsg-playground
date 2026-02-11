import { FileCode, CheckCircle2, ArrowLeftRight, Paintbrush, Trash2, HelpCircle } from 'lucide-react';

interface ToolbarProps {
  onParse?: () => void;
  onValidate?: () => void;
  onTranslate?: () => void;
  onFormat?: () => void;
  onClear?: () => void;
  onSampleSelect?: (sampleId: string) => void;
  onShowHelp?: () => void;
  samples?: Array<{ id: string; label: string; description: string }>;
  selectedSample?: string;
}

export default function Toolbar({
  onParse,
  onValidate,
  onTranslate,
  onFormat,
  onClear,
  onSampleSelect,
  onShowHelp,
  samples = [],
  selectedSample = '',
}: ToolbarProps) {
  return (
    <div className="border-b border-zinc-800 bg-zinc-900 px-4 py-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={onParse}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            title="Parse message (Ctrl+Enter)"
            aria-label="Parse message"
          >
            <FileCode size={16} aria-hidden="true" />
            Parse
          </button>
          <button
            onClick={onValidate}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
            title="Validate message (Ctrl+Shift+V)"
            aria-label="Validate message"
          >
            <CheckCircle2 size={16} aria-hidden="true" />
            Validate
          </button>
          <button
            onClick={onTranslate}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors"
            title="Translate message (Ctrl+Shift+T)"
            aria-label="Translate message"
          >
            <ArrowLeftRight size={16} aria-hidden="true" />
            Translate
          </button>
          <button
            onClick={onFormat}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors"
            title="Format message (Ctrl+Shift+F)"
            aria-label="Format message"
          >
            <Paintbrush size={16} aria-hidden="true" />
            Format
          </button>
        </div>

        <div className="h-6 w-px bg-zinc-700" />

        <select
          value={selectedSample}
          onChange={(e) => onSampleSelect?.(e.target.value)}
          className="px-3 py-1.5 text-sm bg-zinc-800 text-white border border-zinc-700 rounded-md hover:bg-zinc-750 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Select sample message"
        >
          <option value="">Load sample message...</option>
          {samples.map((sample) => (
            <option key={sample.id} value={sample.id} title={sample.description}>
              {sample.label}
            </option>
          ))}
        </select>

        <div className="flex-1" />

        <button
          onClick={onShowHelp}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
          title="Show keyboard shortcuts (Ctrl+/)"
          aria-label="Show keyboard shortcuts"
        >
          <HelpCircle size={16} />
        </button>

        <button
          onClick={onClear}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
          title="Clear all (Ctrl+K)"
          aria-label="Clear all"
        >
          <Trash2 size={16} />
          Clear
        </button>
      </div>
    </div>
  );
}
