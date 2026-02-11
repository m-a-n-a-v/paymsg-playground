import { useState, useEffect, useCallback } from 'react';
import './styles/globals.css';
import Header from './components/Header';
import Toolbar from './components/Toolbar';
import StatusBar from './components/StatusBar';
import { Editor } from './components/Editor';
import { ValidationPanel } from './components/ValidationPanel';
import { TranslationPanel } from './components/TranslationPanel';
import { FieldInspector } from './components/FieldInspector';
import { DiffView } from './components/DiffView';
import { samples } from './samples/messages';
import { MessageFormat, MessageType } from './engine/types';
import { useEngine } from './hooks/useEngine';

type OutputMode = 'editor' | 'validation' | 'translation' | 'inspector' | 'diff';

function App() {
  const engine = useEngine();
  const [selectedSample, setSelectedSample] = useState('');
  const [inputLanguage, setInputLanguage] = useState<'mt' | 'xml'>('mt');
  const [outputLanguage, setOutputLanguage] = useState<'mt' | 'xml' | 'json'>('json');
  const [outputMode, setOutputMode] = useState<OutputMode>('editor');

  // Update input language when detection changes
  useEffect(() => {
    if (engine.detectionResult) {
      setInputLanguage(engine.detectionResult.format === MessageFormat.MX ? 'xml' : 'mt');
    }
  }, [engine.detectionResult]);

  // Update output language based on content
  useEffect(() => {
    setOutputLanguage(engine.outputLanguage);
  }, [engine.outputLanguage]);

  const handleSampleSelect = useCallback(
    (sampleId: string) => {
      setSelectedSample(sampleId);
      const sample = samples.find((s: { id: string }) => s.id === sampleId);
      if (sample !== undefined) {
        engine.setInputMessage(sample.content);
      }
    },
    [engine]
  );

  const handleClear = useCallback(() => {
    engine.clear();
    setSelectedSample('');
    setInputLanguage('mt');
    setOutputLanguage('json');
    setOutputMode('editor');
  }, [engine]);

  const handleParse = useCallback(() => {
    engine.parse();
    setOutputMode('inspector');
  }, [engine]);

  const handleValidate = useCallback(() => {
    void engine.validate();
    setOutputMode('validation');
  }, [engine]);

  const handleTranslate = useCallback(() => {
    // Determine target format based on current detection
    if (!engine.detectionResult) {
      return;
    }
    const targetFormat = engine.detectionResult.format === MessageFormat.MT
      ? MessageFormat.MX
      : MessageFormat.MT;

    void engine.translate(targetFormat);
    setOutputMode('diff');
  }, [engine]);

  const handleFormat = () => {
    // Placeholder for format action
    console.log('Format functionality will be implemented');
  };

  const handleCopyOutput = useCallback(() => {
    if (engine.translationResult?.translatedMessage) {
      void navigator.clipboard.writeText(engine.translationResult.translatedMessage);
    }
  }, [engine.translationResult]);

  const handleSwapInputOutput = useCallback(() => {
    if (engine.translationResult?.translatedMessage) {
      engine.setInputMessage(engine.translationResult.translatedMessage);
      setOutputMode('editor');
    }
  }, [engine]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl/Cmd modifier
      const isMod = event.ctrlKey || event.metaKey;

      if (isMod && event.key === 'Enter') {
        event.preventDefault();
        handleParse();
      } else if (isMod && event.shiftKey && event.key === 'V') {
        event.preventDefault();
        handleValidate();
      } else if (isMod && event.shiftKey && event.key === 'T') {
        event.preventDefault();
        handleTranslate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleParse, handleValidate, handleTranslate]);

  return (
    <div className="h-screen flex flex-col bg-[var(--color-terminal-bg)] text-[var(--color-terminal-fg)]">
      <Header />
      <Toolbar
        onParse={handleParse}
        onValidate={handleValidate}
        onTranslate={handleTranslate}
        onFormat={handleFormat}
        onClear={handleClear}
        onSampleSelect={handleSampleSelect}
        samples={samples.map((s: { id: string; label: string; description: string }) => ({ id: s.id, label: s.label, description: s.description }))}
        selectedSample={selectedSample}
      />

      <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden">
        <div className="border-r border-zinc-800 flex flex-col">
          <div className="border-b border-zinc-800 px-4 py-2 bg-zinc-900">
            <span className="text-sm font-medium text-zinc-300">Input</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <Editor
              value={engine.inputMessage}
              onChange={engine.setInputMessage}
              language={inputLanguage}
              placeholder="Paste a SWIFT MT or ISO 20022 MX message here..."
            />
          </div>
        </div>

        <div className="flex flex-col">
          <div className="border-b border-zinc-800 bg-zinc-900 flex">
            <button
              onClick={() => {
                setOutputMode('inspector');
              }}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                outputMode === 'inspector'
                  ? 'text-cyan-400 border-cyan-400'
                  : 'text-zinc-400 border-transparent hover:text-zinc-300'
              }`}
            >
              Inspector
            </button>
            <button
              onClick={() => {
                setOutputMode('editor');
              }}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                outputMode === 'editor'
                  ? 'text-cyan-400 border-cyan-400'
                  : 'text-zinc-400 border-transparent hover:text-zinc-300'
              }`}
            >
              Output
            </button>
            <button
              onClick={() => {
                setOutputMode('validation');
              }}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                outputMode === 'validation'
                  ? 'text-cyan-400 border-cyan-400'
                  : 'text-zinc-400 border-transparent hover:text-zinc-300'
              }`}
            >
              Validation
            </button>
            <button
              onClick={() => {
                setOutputMode('translation');
              }}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                outputMode === 'translation'
                  ? 'text-cyan-400 border-cyan-400'
                  : 'text-zinc-400 border-transparent hover:text-zinc-300'
              }`}
            >
              Translation
            </button>
            <button
              onClick={() => {
                setOutputMode('diff');
              }}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                outputMode === 'diff'
                  ? 'text-cyan-400 border-cyan-400'
                  : 'text-zinc-400 border-transparent hover:text-zinc-300'
              }`}
            >
              Diff
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {outputMode === 'inspector' ? (
              <FieldInspector
                parsedMessage={engine.parsedMessage ?? undefined}
                messageType={engine.detectionResult?.messageType ?? MessageType.UNKNOWN}
              />
            ) : engine.error && outputMode === 'editor' ? (
              <div className="p-4 bg-red-950/50 border border-red-800 rounded m-2">
                <p className="text-red-300 font-medium">Error</p>
                <p className="text-red-200 text-sm mt-1">{engine.error}</p>
              </div>
            ) : outputMode === 'validation' ? (
              <ValidationPanel result={engine.validationResult ?? undefined} />
            ) : outputMode === 'translation' ? (
              <TranslationPanel
                result={engine.translationResult ?? undefined}
                onCopyOutput={handleCopyOutput}
                onSwapInputOutput={handleSwapInputOutput}
              />
            ) : outputMode === 'diff' ? (
              <DiffView
                translationResult={engine.translationResult ?? undefined}
                originalMessage={engine.inputMessage}
                parsedMessage={engine.parsedMessage ?? undefined}
              />
            ) : (
              <Editor
                value={engine.outputContent}
                onChange={() => {}}
                language={outputLanguage}
                readOnly={true}
                placeholder="Output will appear here..."
              />
            )}
          </div>
        </div>
      </div>

      <StatusBar
        messageFormat={engine.detectionResult?.format}
        messageType={engine.detectionResult?.messageType}
      />
    </div>
  );
}

export default App;
