/**
 * CodeMirror-based editor component for SWIFT MT and ISO 20022 MX messages
 * Supports syntax highlighting for both formats with a dark theme
 */

import { useEffect, useRef, useCallback } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState, Extension } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { oneDark } from '@codemirror/theme-one-dark';
import { xml } from '@codemirror/lang-xml';
import { javascript } from '@codemirror/lang-javascript';
import type { ViewUpdate } from '@codemirror/view';
import { mt } from './mtLang';

export interface EditorProps {
  /** Current editor value */
  value: string;

  /** Callback when content changes */
  onChange?: (value: string) => void;

  /** Language mode: 'mt' for SWIFT MT, 'xml' for MX messages, 'json' for structured output */
  language?: 'mt' | 'xml' | 'json';

  /** Whether the editor is read-only */
  readOnly?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Placeholder text when empty */
  placeholder?: string;
}

/**
 * Basic setup for CodeMirror - manually assembled to avoid 'codemirror' package dependency
 */
const basicSetup: Extension[] = [
  lineNumbers(),
  highlightActiveLineGutter(),
  history(),
  bracketMatching(),
  closeBrackets(),
  indentOnInput(),
  highlightSelectionMatches(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
  ]),
];

/**
 * CodeMirror 6 editor component with syntax highlighting for MT and MX messages
 */
export function Editor({
  value,
  onChange,
  language = 'mt',
  readOnly = false,
  className = '',
  placeholder = '',
}: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Memoize onChange to prevent recreating editor on every render
  const handleChange = useCallback(
    (update: ViewUpdate) => {
      if (update.docChanged && onChange) {
        onChange(update.state.doc.toString());
      }
    },
    [onChange]
  );

  // Create editor on mount
  useEffect(() => {
    if (!editorRef.current) return;

    // Build extensions array
    const extensions: Extension[] = [
      ...basicSetup,
      oneDark,
      language === 'xml' ? xml() : language === 'json' ? javascript() : mt(),
      EditorView.lineWrapping,
      EditorView.editable.of(!readOnly),
      EditorState.readOnly.of(readOnly),
    ];

    // Add onChange listener if provided
    if (onChange && !readOnly) {
      extensions.push(EditorView.updateListener.of(handleChange));
    }

    // Add placeholder if provided
    if (placeholder && !readOnly) {
      extensions.push(
        EditorView.contentAttributes.of({
          'aria-placeholder': placeholder,
        })
      );
    }

    // Create editor state
    const state = EditorState.create({
      doc: value,
      extensions,
    });

    // Create editor view
    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    // Cleanup on unmount
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, readOnly, placeholder, handleChange]); // Recreate editor when these change (not value)

  // Update content when value prop changes (but not from user input)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentValue = view.state.doc.toString();
    if (currentValue !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentValue.length,
          insert: value,
        },
      });
    }
  }, [value]);

  return (
    <div
      ref={editorRef}
      className={`editor-container ${className}`}
      data-testid="codemirror-editor"
    />
  );
}
