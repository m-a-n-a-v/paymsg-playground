import { useState } from 'react';
import './styles/globals.css';
import Header from './components/Header';
import Toolbar from './components/Toolbar';
import StatusBar from './components/StatusBar';
import { Editor } from './components/Editor';
import { samples } from './samples/messages';
import { detectMessage } from './engine/detector';
import { MessageFormat, MessageType } from './engine/types';

function App() {
  const [inputValue, setInputValue] = useState('');
  const [outputValue, setOutputValue] = useState('');
  const [selectedSample, setSelectedSample] = useState('');
  const [detectedFormat, setDetectedFormat] = useState<MessageFormat | undefined>(undefined);
  const [detectedType, setDetectedType] = useState<MessageType | undefined>(undefined);
  const [inputLanguage, setInputLanguage] = useState<'mt' | 'xml'>('mt');
  const [outputLanguage, setOutputLanguage] = useState<'mt' | 'xml'>('mt');

  const handleSampleSelect = (sampleId: string) => {
    setSelectedSample(sampleId);
    const sample = samples.find((s: { id: string }) => s.id === sampleId);
    if (sample) {
      setInputValue(sample.content);
      const detection = detectMessage(sample.content);
      setDetectedFormat(detection.format);
      setDetectedType(detection.messageType);
      setInputLanguage(detection.format === MessageFormat.MX ? 'xml' : 'mt');
    }
  };

  const handleClear = () => {
    setInputValue('');
    setOutputValue('');
    setSelectedSample('');
    setDetectedFormat(undefined);
    setDetectedType(undefined);
    setInputLanguage('mt');
    setOutputLanguage('mt');
  };

  const handleParse = () => {
    // Placeholder for PLAY-010
    setOutputValue('Parse functionality will be implemented in PLAY-010');
  };

  const handleValidate = () => {
    // Placeholder for PLAY-012
    setOutputValue('Validation functionality will be implemented in PLAY-012');
  };

  const handleTranslate = () => {
    // Placeholder for PLAY-015
    setOutputValue('Translation functionality will be implemented in PLAY-015');
  };

  const handleFormat = () => {
    // Placeholder for format action
    setOutputValue('Format functionality will be implemented');
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    // Auto-detect format on input change
    if (value.trim()) {
      const detection = detectMessage(value);
      setDetectedFormat(detection.format);
      setDetectedType(detection.messageType);
      setInputLanguage(detection.format === MessageFormat.MX ? 'xml' : 'mt');
    } else {
      setDetectedFormat(undefined);
      setDetectedType(undefined);
    }
  };

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
              value={inputValue}
              onChange={handleInputChange}
              language={inputLanguage}
              placeholder="Paste a SWIFT MT or ISO 20022 MX message here..."
            />
          </div>
        </div>

        <div className="flex flex-col">
          <div className="border-b border-zinc-800 px-4 py-2 bg-zinc-900">
            <span className="text-sm font-medium text-zinc-300">Output</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <Editor
              value={outputValue}
              onChange={setOutputValue}
              language={outputLanguage}
              readOnly={true}
              placeholder="Output will appear here..."
            />
          </div>
        </div>
      </div>

      <StatusBar messageFormat={detectedFormat} messageType={detectedType} />
    </div>
  );
}

export default App;
