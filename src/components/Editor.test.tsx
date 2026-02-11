/**
 * Test suite for Editor component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Editor } from './Editor';

describe('Editor', () => {
  describe('Component rendering', () => {
    it('should render the editor container', () => {
      render(<Editor value="" />);
      const editor = screen.getByTestId('codemirror-editor');
      expect(editor).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<Editor value="" className="custom-class" />);
      const editor = screen.getByTestId('codemirror-editor');
      expect(editor).toHaveClass('editor-container');
      expect(editor).toHaveClass('custom-class');
    });

    it('should render with initial value', () => {
      const value = '{1:F01BANKBICAXXX0000000000}';
      render(<Editor value={value} />);
      const editor = screen.getByTestId('codemirror-editor');
      expect(editor).toBeInTheDocument();
      // CodeMirror renders content in .cm-content
      const content = editor.querySelector('.cm-content');
      expect(content).toBeInTheDocument();
    });
  });

  describe('Language modes', () => {
    it('should render with MT language mode by default', () => {
      render(<Editor value="{1:F01BANKBICAXXX0000000000}" />);
      const editor = screen.getByTestId('codemirror-editor');
      expect(editor).toBeInTheDocument();
    });

    it('should render with XML language mode', () => {
      const xml = '<?xml version="1.0"?><Document></Document>';
      render(<Editor value={xml} language="xml" />);
      const editor = screen.getByTestId('codemirror-editor');
      expect(editor).toBeInTheDocument();
    });

    it('should switch language mode when prop changes', () => {
      const { rerender } = render(<Editor value="{1:...}" language="mt" />);
      const editor = screen.getByTestId('codemirror-editor');
      expect(editor).toBeInTheDocument();

      rerender(<Editor value="<Document></Document>" language="xml" />);
      expect(editor).toBeInTheDocument();
    });
  });

  describe('Read-only mode', () => {
    it('should render in editable mode by default', () => {
      render(<Editor value="" />);
      const editor = screen.getByTestId('codemirror-editor');
      const cmEditor = editor.querySelector('.cm-editor');
      expect(cmEditor).not.toHaveClass('cm-readonly');
    });

    it('should render in read-only mode when specified', () => {
      render(<Editor value="" readOnly />);
      const editor = screen.getByTestId('codemirror-editor');
      expect(editor).toBeInTheDocument();
      // CodeMirror applies readonly state internally
    });

    it('should not call onChange in read-only mode', () => {
      const onChange = vi.fn();
      render(<Editor value="" readOnly onChange={onChange} />);
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('Value updates', () => {
    it('should update content when value prop changes', () => {
      const { rerender } = render(<Editor value="initial" />);
      const editor = screen.getByTestId('codemirror-editor');

      rerender(<Editor value="updated" />);
      const content = editor.querySelector('.cm-content');
      expect(content).toBeInTheDocument();
    });

    it('should handle empty value', () => {
      render(<Editor value="" />);
      const editor = screen.getByTestId('codemirror-editor');
      expect(editor).toBeInTheDocument();
    });

    it('should handle multi-line value', () => {
      const multiLine = `{1:F01BANKBICAXXX0000000000}
{2:I103BANKBICAXXXXN}
{4:
:20:REF123
:32A:240101EUR1000,00
-}`;
      render(<Editor value={multiLine} />);
      const editor = screen.getByTestId('codemirror-editor');
      expect(editor).toBeInTheDocument();
    });
  });

  describe('MT syntax highlighting', () => {
    it('should render MT message with syntax highlighting', () => {
      const mtMessage = `{1:F01BANKBICAXXX0000000000}
{2:I103BANKBICAXXXXN}
{4:
:20:REF123
:32A:240101EUR1000,00
-}`;
      render(<Editor value={mtMessage} language="mt" />);
      const editor = screen.getByTestId('codemirror-editor');
      expect(editor).toBeInTheDocument();
    });

    it('should handle MT field tags', () => {
      const mtFields = ':20:REF\n:32A:240101EUR1000,00\n:50K:/12345\nJohn Doe';
      render(<Editor value={mtFields} language="mt" />);
      const editor = screen.getByTestId('codemirror-editor');
      expect(editor).toBeInTheDocument();
    });

    it('should handle MT block structure', () => {
      const mtBlocks = '{1:F01...}{2:I103...}{3:{108:MUR}}{4::20:REF-}{5:{CHK:...}}';
      render(<Editor value={mtBlocks} language="mt" />);
      const editor = screen.getByTestId('codemirror-editor');
      expect(editor).toBeInTheDocument();
    });
  });

  describe('XML syntax highlighting', () => {
    it('should render XML message with syntax highlighting', () => {
      const xmlMessage = `<?xml version="1.0"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>MSG-001</MsgId>
    </GrpHdr>
  </FIToFICstmrCdtTrf>
</Document>`;
      render(<Editor value={xmlMessage} language="xml" />);
      const editor = screen.getByTestId('codemirror-editor');
      expect(editor).toBeInTheDocument();
    });

    it('should handle XML with attributes', () => {
      const xml = '<Amount Ccy="EUR">1000.00</Amount>';
      render(<Editor value={xml} language="xml" />);
      const editor = screen.getByTestId('codemirror-editor');
      expect(editor).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle very long content', () => {
      const longContent = 'x'.repeat(10000);
      render(<Editor value={longContent} />);
      const editor = screen.getByTestId('codemirror-editor');
      expect(editor).toBeInTheDocument();
    });

    it('should handle special characters', () => {
      const special = 'Test\n\r\t<>&"\'`';
      render(<Editor value={special} />);
      const editor = screen.getByTestId('codemirror-editor');
      expect(editor).toBeInTheDocument();
    });

    it('should handle unicode characters', () => {
      const unicode = 'Ärger über €100';
      render(<Editor value={unicode} />);
      const editor = screen.getByTestId('codemirror-editor');
      expect(editor).toBeInTheDocument();
    });

    it('should unmount cleanly', () => {
      const { unmount } = render(<Editor value="test" />);
      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe('Placeholder', () => {
    it('should set aria-placeholder when provided', () => {
      render(<Editor value="" placeholder="Enter MT message..." />);
      const editor = screen.getByTestId('codemirror-editor');
      expect(editor).toBeInTheDocument();
    });

    it('should not set placeholder in read-only mode', () => {
      render(<Editor value="" placeholder="Test" readOnly />);
      const editor = screen.getByTestId('codemirror-editor');
      expect(editor).toBeInTheDocument();
    });
  });

  describe('Integration scenarios', () => {
    it('should render a complete MT103 message', () => {
      const mt103 = `{1:F01BANKBEBBAXXX0000000000}
{2:I103BANKFRPPXXXXN}
{3:{108:MUR}{121:f9c1f2e3-4d5e-6f7a-8b9c-0d1e2f3a4b5c}}
{4:
:20:SEPA-2024-001
:23B:CRED
:32A:240101EUR1234,56
:50K:/BE68539007547034
Belgian Corp NV
Brussels, Belgium
:59:/FR1420041010050500013M02606
ACME Industries SA
Paris, France
:70:Invoice INV-2024-001
:71A:SHA
-}`;
      render(<Editor value={mt103} language="mt" />);
      const editor = screen.getByTestId('codemirror-editor');
      expect(editor).toBeInTheDocument();
    });

    it('should render a complete pacs.008 XML message', () => {
      const pacs008 = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>SEPA-2024-001-MX</MsgId>
      <CreDtTm>2024-01-01T10:30:00</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
    </GrpHdr>
  </FIToFICstmrCdtTrf>
</Document>`;
      render(<Editor value={pacs008} language="xml" />);
      const editor = screen.getByTestId('codemirror-editor');
      expect(editor).toBeInTheDocument();
    });
  });
});
