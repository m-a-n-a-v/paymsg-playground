import { FileCode, CheckCircle2, ArrowLeftRight, Paintbrush, Trash2 } from 'lucide-react';

interface ToolbarProps {
  onParse?: () => void;
  onValidate?: () => void;
  onTranslate?: () => void;
  onFormat?: () => void;
  onClear?: () => void;
  onSampleSelect?: (sampleId: string) => void;
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
          >
            <FileCode size={16} />
            Parse
          </button>
          <button
            onClick={onValidate}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
            title="Validate message (Ctrl+Shift+V)"
          >
            <CheckCircle2 size={16} />
            Validate
          </button>
          <button
            onClick={onTranslate}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors"
            title="Translate message (Ctrl+Shift+T)"
          >
            <ArrowLeftRight size={16} />
            Translate
          </button>
          <button
            onClick={onFormat}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors"
            title="Format message (Ctrl+Shift+F)"
          >
            <Paintbrush size={16} />
            Format
          </button>
        </div>

        <div className="h-6 w-px bg-zinc-700" />

        <select
          value={selectedSample}
          onChange={(e) => onSampleSelect?.(e.target.value)}
          className="px-3 py-1.5 text-sm bg-zinc-800 text-white border border-zinc-700 rounded-md hover:bg-zinc-750 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          onClick={onClear}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
          title="Clear all (Ctrl+K)"
        >
          <Trash2 size={16} />
          Clear
        </button>
      </div>
    </div>
  );
}
