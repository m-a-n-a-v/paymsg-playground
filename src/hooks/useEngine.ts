import { useState, useCallback } from 'react';
import { parseMessage } from '../engine/parser';
import { detectMessage } from '../engine/detector';
import type { ParsedMessage, DetectionResult } from '../engine/types';
import { MessageFormat } from '../engine/types';

interface EngineState {
  inputMessage: string;
  outputContent: string;
  outputLanguage: 'json' | 'mt' | 'xml';
  parsedMessage: ParsedMessage | null;
  detectionResult: DetectionResult | null;
  error: string | null;
  isReadOnly: boolean;
}

interface EngineActions {
  setInputMessage: (message: string) => void;
  parse: () => void;
  clear: () => void;
  detectFormat: (message: string) => DetectionResult;
}

const initialState: EngineState = {
  inputMessage: '',
  outputContent: '',
  outputLanguage: 'json',
  parsedMessage: null,
  detectionResult: null,
  error: null,
  isReadOnly: true,
};

export function useEngine(): EngineState & EngineActions {
  const [state, setState] = useState<EngineState>(initialState);

  const detectFormat = useCallback((message: string): DetectionResult => {
    const result = detectMessage(message);
    setState((prev) => ({ ...prev, detectionResult: result }));
    return result;
  }, []);

  const setInputMessage = useCallback(
    (message: string) => {
      setState((prev) => ({ ...prev, inputMessage: message }));
      if (message.trim()) {
        detectFormat(message);
      } else {
        setState((prev) => ({ ...prev, detectionResult: null }));
      }
    },
    [detectFormat]
  );

  const parse = useCallback(() => {
    try {
      if (!state.inputMessage.trim()) {
        setState((prev) => ({
          ...prev,
          error: 'No message to parse',
          outputContent: '',
          parsedMessage: null,
        }));
        return;
      }

      const detection = detectMessage(state.inputMessage);
      if (detection.format === MessageFormat.UNKNOWN) {
        setState((prev) => ({
          ...prev,
          error: 'Unable to detect message format',
          outputContent: '',
          parsedMessage: null,
        }));
        return;
      }

      const parsed = parseMessage(state.inputMessage);
      const outputJson = JSON.stringify(parsed, null, 2);

      setState((prev) => ({
        ...prev,
        outputContent: outputJson,
        outputLanguage: 'json',
        parsedMessage: parsed,
        detectionResult: detection,
        error: null,
        isReadOnly: true,
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown parsing error';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        outputContent: `Error: ${errorMessage}`,
        parsedMessage: null,
      }));
    }
  }, [state.inputMessage]);

  const clear = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    setInputMessage,
    parse,
    clear,
    detectFormat,
  };
}
