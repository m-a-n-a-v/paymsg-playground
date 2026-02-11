import { useState, useEffect, useRef } from 'react';
import { Link2, Link2Off } from 'lucide-react';
import { Editor } from './Editor';
import { MessageFormat, MessageType } from '../engine/types';
import type { TranslationResult, ParsedMessage } from '../engine/types';
import { loadMapping, type FieldMapping } from '../specs/loader';

interface DiffViewProps {
  translationResult: TranslationResult | undefined;
  originalMessage: string;
  parsedMessage: ParsedMessage | undefined;
}

// Color palette for field correspondence (10 distinct colors)
const FIELD_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#06b6d4', // cyan
  '#84cc16', // lime
];

export function DiffView({ translationResult, originalMessage }: DiffViewProps) {
  const [scrollSync, setScrollSync] = useState(true);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const leftEditorRef = useRef<HTMLDivElement>(null);
  const rightEditorRef = useRef<HTMLDivElement>(null);

  // Load mapping data when translation result is available
  useEffect(() => {
    const loadMappingData = async () => {
      if (!translationResult) {
        setFieldMappings([]);
        return;
      }

      try {
        // Determine mapping pair based on source and target types
        const { sourceType, targetType } = translationResult;
        let mappingPair: string | undefined;

        // Map message types to mapping file names
        if (sourceType === MessageType.MT103 || targetType === MessageType.MT103) {
          mappingPair = 'mt103_pacs008';
        } else if (sourceType === MessageType.MT202 || targetType === MessageType.MT202) {
          mappingPair = 'mt202_pacs009';
        } else if (sourceType === MessageType.MT940 || targetType === MessageType.MT940) {
          mappingPair = 'mt940_camt053';
        } else if (sourceType === MessageType.MT942 || targetType === MessageType.MT942) {
          mappingPair = 'mt942_camt052';
        }

        if (mappingPair !== undefined) {
          const mapping = await loadMapping(mappingPair);
          setFieldMappings(mapping.mappings);
        }
      } catch (error) {
        console.error('Failed to load mapping data:', error);
        setFieldMappings([]);
      }
    };

    void loadMappingData();
  }, [translationResult]);

  // Handle synchronized scrolling
  useEffect(() => {
    if (!scrollSync || !leftEditorRef.current || !rightEditorRef.current) {
      return;
    }

    const leftEditor = leftEditorRef.current.querySelector('.cm-scroller');
    const rightEditor = rightEditorRef.current.querySelector('.cm-scroller');

    if (!leftEditor || !rightEditor) {
      return;
    }

    const handleLeftScroll = () => {
      if (rightEditor instanceof HTMLElement && leftEditor instanceof HTMLElement) {
        rightEditor.scrollTop = leftEditor.scrollTop;
      }
    };

    const handleRightScroll = () => {
      if (leftEditor instanceof HTMLElement && rightEditor instanceof HTMLElement) {
        leftEditor.scrollTop = rightEditor.scrollTop;
      }
    };

    leftEditor.addEventListener('scroll', handleLeftScroll);
    rightEditor.addEventListener('scroll', handleRightScroll);

    return () => {
      leftEditor.removeEventListener('scroll', handleLeftScroll);
      rightEditor.removeEventListener('scroll', handleRightScroll);
    };
  }, [scrollSync]);

  if (!translationResult) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        <div className="text-center">
          <Link2 className="w-12 h-12 mx-auto mb-2 text-zinc-600" />
          <p>No translation to compare yet</p>
          <p className="text-sm mt-1">Translate a message to see side-by-side comparison</p>
        </div>
      </div>
    );
  }

  const { translatedMessage, sourceFormat, targetFormat, sourceType, targetType } = translationResult;

  // Determine which message is MT and which is MX
  const leftMessage = sourceFormat === MessageFormat.MT ? originalMessage : translatedMessage;
  const rightMessage = sourceFormat === MessageFormat.MX ? originalMessage : translatedMessage;
  const leftLanguage = sourceFormat === MessageFormat.MT ? 'mt' : 'xml';
  const rightLanguage = targetFormat === MessageFormat.MX ? 'xml' : 'mt';
  const leftLabel = sourceFormat === MessageFormat.MT ? sourceType : targetType;
  const rightLabel = targetFormat === MessageFormat.MX ? targetType : sourceType;

  return (
    <div className="h-full flex flex-col">
      {/* Header with controls */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-zinc-300">
            <span className="font-medium">Side-by-side comparison:</span>
            <span className="ml-2 font-mono text-cyan-400">{leftLabel}</span>
            <span className="mx-2 text-zinc-500">↔</span>
            <span className="font-mono text-cyan-400">{rightLabel}</span>
          </div>
          <button
            onClick={() => {
              setScrollSync(!scrollSync);
            }}
            className={`text-xs px-3 py-1 rounded border flex items-center gap-1 ${
              scrollSync
                ? 'bg-cyan-900/30 text-cyan-400 border-cyan-700 hover:bg-cyan-900/50'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
            }`}
            title={scrollSync ? 'Synchronized scrolling enabled' : 'Independent scrolling'}
          >
            {scrollSync ? <Link2 className="w-3 h-3" /> : <Link2Off className="w-3 h-3" />}
            {scrollSync ? 'Synced' : 'Independent'}
          </button>
        </div>
      </div>

      {/* Side-by-side editors */}
      <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden">
        {/* Left panel - MT message */}
        <div className="border-r border-zinc-800 flex flex-col">
          <div className="border-b border-zinc-800 px-4 py-2 bg-zinc-900">
            <span className="text-sm font-medium text-zinc-300">
              {sourceFormat === MessageFormat.MT ? 'MT (Original)' : 'MT (Translated)'}
            </span>
          </div>
          <div className="flex-1 overflow-hidden" ref={leftEditorRef}>
            <Editor
              value={leftMessage}
              onChange={() => {}}
              language={leftLanguage}
              readOnly={true}
            />
          </div>
        </div>

        {/* Right panel - MX message */}
        <div className="flex flex-col">
          <div className="border-b border-zinc-800 px-4 py-2 bg-zinc-900">
            <span className="text-sm font-medium text-zinc-300">
              {targetFormat === MessageFormat.MX ? 'MX (Translated)' : 'MX (Original)'}
            </span>
          </div>
          <div className="flex-1 overflow-hidden" ref={rightEditorRef}>
            <Editor
              value={rightMessage}
              onChange={() => {}}
              language={rightLanguage}
              readOnly={true}
            />
          </div>
        </div>
      </div>

      {/* Field correspondence legend */}
      {fieldMappings.length > 0 && (
        <div className="border-t border-zinc-800 p-4 bg-zinc-950 overflow-y-auto max-h-48">
          <div className="text-sm font-medium text-zinc-300 mb-3">Field Correspondence Legend</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {fieldMappings.slice(0, 20).map((mapping, idx) => {
              const color = FIELD_COLORS[idx % FIELD_COLORS.length];
              return (
                <div
                  key={String(idx)}
                  className="flex items-center gap-2 p-2 rounded bg-zinc-900/50 border border-zinc-800"
                >
                  <div
                    className="w-3 h-3 rounded flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-cyan-400">{mapping.mt_tag}</span>
                      <span className="text-zinc-500">↔</span>
                      <span className="font-mono text-purple-400 truncate" title={mapping.mx_path}>
                        {mapping.mx_path.split('/').pop()}
                      </span>
                    </div>
                    <div className="text-zinc-500 truncate" title={mapping.mt_field_name}>
                      {mapping.mt_field_name}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {fieldMappings.length > 20 && (
            <div className="text-xs text-zinc-500 mt-2 text-center">
              Showing first 20 of {String(fieldMappings.length)} field mappings
            </div>
          )}
        </div>
      )}
    </div>
  );
}
