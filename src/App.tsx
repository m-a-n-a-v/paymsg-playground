import { useState, useEffect, useCallback } from 'react';
import './styles/globals.css';
import Header from './components/Header';
import Toolbar from './components/Toolbar';
import StatusBar from './components/StatusBar';
import { Editor } from './components/Editor';
import { ValidationPanel } from './components/ValidationPanel';
import { samples } from './samples/messages';
import { MessageFormat } from './engine/types';
import { useEngine } from './hooks/useEngine';

type OutputMode = 'editor' | 'validation';

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
    setOutputMode('editor');
  }, [engine]);

  const handleValidate = useCallback(() => {
    void engine.validate();
    setOutputMode('validation');
  }, [engine]);

  const handleTranslate = () => {
    // Placeholder for PLAY-015
    console.log('Translation functionality will be implemented in PLAY-015');
  };

  const handleFormat = () => {
    // Placeholder for format action
    console.log('Format functionality will be implemented');
  };

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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleParse, handleValidate]);

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
          <div className="border-b border-zinc-800 px-4 py-2 bg-zinc-900">
            <span className="text-sm font-medium text-zinc-300">
              {outputMode === 'validation' ? 'Validation' : 'Output'}
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            {engine.error && outputMode === 'editor' ? (
              <div className="p-4 bg-red-950/50 border border-red-800 rounded m-2">
                <p className="text-red-300 font-medium">Error</p>
                <p className="text-red-200 text-sm mt-1">{engine.error}</p>
              </div>
            ) : outputMode === 'validation' ? (
              <ValidationPanel result={engine.validationResult ?? undefined} />
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
