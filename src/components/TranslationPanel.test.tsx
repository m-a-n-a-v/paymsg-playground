import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TranslationPanel } from './TranslationPanel';
import { MessageFormat, MessageType, DataLossCategory } from '../engine/types';
import type { TranslationResult } from '../engine/types';

describe('TranslationPanel', () => {
  describe('empty state', () => {
    it('should render empty state when no result is provided', () => {
      render(<TranslationPanel result={undefined} />);

      expect(screen.getByText('No translation results yet')).toBeInTheDocument();
      expect(screen.getByText('Click Translate to convert your message')).toBeInTheDocument();
    });
  });

  describe('with translation result', () => {
    const mockResult: TranslationResult = {
      translatedMessage: '{1:F01BANKBICAXXX0000000000}{2:O1031234BANKBICBXXXX}{4:\n:20:REF123\n:32A:261231EUR1000,00\n-}',
      sourceFormat: MessageFormat.MX,
      targetFormat: MessageFormat.MT,
      sourceType: MessageType.PACS008,
      targetType: MessageType.MT103,
      warnings: [],
    };

    it('should render translation direction', () => {
      render(<TranslationPanel result={mockResult} />);

      expect(screen.getByText('pacs.008.001.10')).toBeInTheDocument();
      expect(screen.getByText('MT103')).toBeInTheDocument();
    });

    it('should render translated message in editor', () => {
      render(<TranslationPanel result={mockResult} />);

      // Check for CodeMirror editor
      const editor = document.querySelector('.cm-editor');
      expect(editor).toBeInTheDocument();
    });

    it('should render Copy button when handler is provided', () => {
      const onCopyOutput = vi.fn();
      render(<TranslationPanel result={mockResult} onCopyOutput={onCopyOutput} />);

      const copyButton = screen.getByTitle('Copy translated message to clipboard');
      expect(copyButton).toBeInTheDocument();
      expect(copyButton).toHaveTextContent('Copy');
    });

    it('should render Swap button when handler is provided', () => {
      const onSwapInputOutput = vi.fn();
      render(<TranslationPanel result={mockResult} onSwapInputOutput={onSwapInputOutput} />);

      const swapButton = screen.getByTitle('Swap input and output (reverse translation)');
      expect(swapButton).toBeInTheDocument();
      expect(swapButton).toHaveTextContent('Swap');
    });

    it('should call onCopyOutput when Copy button is clicked', () => {
      const onCopyOutput = vi.fn();

      render(<TranslationPanel result={mockResult} onCopyOutput={onCopyOutput} />);

      const copyButton = screen.getByTitle('Copy translated message to clipboard');
      fireEvent.click(copyButton);

      expect(onCopyOutput).toHaveBeenCalledTimes(1);
    });

    it('should call onSwapInputOutput when Swap button is clicked', () => {
      const onSwapInputOutput = vi.fn();

      render(<TranslationPanel result={mockResult} onSwapInputOutput={onSwapInputOutput} />);

      const swapButton = screen.getByTitle('Swap input and output (reverse translation)');
      fireEvent.click(swapButton);

      expect(onSwapInputOutput).toHaveBeenCalledTimes(1);
    });

    it('should show success message when no warnings', () => {
      render(<TranslationPanel result={mockResult} />);

      expect(screen.getByText('Translation completed successfully with no data loss warnings')).toBeInTheDocument();
    });

    it('should not render Copy button when handler is not provided', () => {
      render(<TranslationPanel result={mockResult} />);

      // Should still have Swap button but not Copy
      expect(screen.queryByTitle('Copy translated message to clipboard')).not.toBeInTheDocument();
    });

    it('should not render Swap button when handler is not provided', () => {
      render(<TranslationPanel result={mockResult} onCopyOutput={vi.fn()} />);

      // Should have Copy button but not Swap
      expect(screen.queryByTitle('Swap input and output (reverse translation)')).not.toBeInTheDocument();
    });
  });

  describe('with data loss warnings', () => {
    const mockResultWithWarnings: TranslationResult = {
      translatedMessage: '<Document>...</Document>',
      sourceFormat: MessageFormat.MT,
      targetFormat: MessageFormat.MX,
      sourceType: MessageType.MT103,
      targetType: MessageType.PACS008,
      warnings: [
        {
          field_path: 'field_20',
          category: DataLossCategory.TRUNCATION,
          description: 'Instruction ID truncated from 35 to 16 characters',
        },
        {
          field_path: 'field_53A',
          category: DataLossCategory.NO_EQUIVALENT,
          description: 'Sender\'s correspondent has no direct equivalent in pacs.008',
        },
        {
          field_path: 'field_71F',
          category: DataLossCategory.OPTIONAL_FIELD,
          description: 'Sender\'s charges not mapped (optional field)',
        },
      ],
    };

    it('should render warnings section header', () => {
      render(<TranslationPanel result={mockResultWithWarnings} />);

      expect(screen.getByText('Data Loss Warnings (3)')).toBeInTheDocument();
    });

    it('should render all warnings', () => {
      render(<TranslationPanel result={mockResultWithWarnings} />);

      expect(screen.getByText('field_20')).toBeInTheDocument();
      expect(screen.getByText('Instruction ID truncated from 35 to 16 characters')).toBeInTheDocument();

      expect(screen.getByText('field_53A')).toBeInTheDocument();
      expect(screen.getByText('Sender\'s correspondent has no direct equivalent in pacs.008')).toBeInTheDocument();

      expect(screen.getByText('field_71F')).toBeInTheDocument();
      expect(screen.getByText('Sender\'s charges not mapped (optional field)')).toBeInTheDocument();
    });

    it('should render warning categories', () => {
      render(<TranslationPanel result={mockResultWithWarnings} />);

      expect(screen.getByText('[Truncation]')).toBeInTheDocument();
      expect(screen.getByText('[No Equivalent]')).toBeInTheDocument();
      expect(screen.getByText('[Optional Field]')).toBeInTheDocument();
    });

    it('should not show success message when warnings exist', () => {
      render(<TranslationPanel result={mockResultWithWarnings} />);

      expect(screen.queryByText('Translation completed successfully with no data loss warnings')).not.toBeInTheDocument();
    });
  });

  describe('all warning categories', () => {
    it('should render TRUNCATION warnings', () => {
      const result: TranslationResult = {
        translatedMessage: 'test',
        sourceFormat: MessageFormat.MT,
        targetFormat: MessageFormat.MX,
        sourceType: MessageType.MT103,
        targetType: MessageType.PACS008,
        warnings: [
          {
            field_path: 'field_20',
            category: DataLossCategory.TRUNCATION,
            description: 'Value truncated',
          },
        ],
      };

      render(<TranslationPanel result={result} />);
      expect(screen.getByText('[Truncation]')).toBeInTheDocument();
    });

    it('should render NO_EQUIVALENT warnings', () => {
      const result: TranslationResult = {
        translatedMessage: 'test',
        sourceFormat: MessageFormat.MT,
        targetFormat: MessageFormat.MX,
        sourceType: MessageType.MT103,
        targetType: MessageType.PACS008,
        warnings: [
          {
            field_path: 'field_53A',
            category: DataLossCategory.NO_EQUIVALENT,
            description: 'No equivalent field',
          },
        ],
      };

      render(<TranslationPanel result={result} />);
      expect(screen.getByText('[No Equivalent]')).toBeInTheDocument();
    });

    it('should render PRECISION_LOSS warnings', () => {
      const result: TranslationResult = {
        translatedMessage: 'test',
        sourceFormat: MessageFormat.MT,
        targetFormat: MessageFormat.MX,
        sourceType: MessageType.MT103,
        targetType: MessageType.PACS008,
        warnings: [
          {
            field_path: 'amount',
            category: DataLossCategory.PRECISION_LOSS,
            description: 'Decimal precision reduced',
          },
        ],
      };

      render(<TranslationPanel result={result} />);
      expect(screen.getByText('[Precision Loss]')).toBeInTheDocument();
    });

    it('should render OPTIONAL_FIELD warnings', () => {
      const result: TranslationResult = {
        translatedMessage: 'test',
        sourceFormat: MessageFormat.MT,
        targetFormat: MessageFormat.MX,
        sourceType: MessageType.MT103,
        targetType: MessageType.PACS008,
        warnings: [
          {
            field_path: 'field_71F',
            category: DataLossCategory.OPTIONAL_FIELD,
            description: 'Optional field not mapped',
          },
        ],
      };

      render(<TranslationPanel result={result} />);
      expect(screen.getByText('[Optional Field]')).toBeInTheDocument();
    });

    it('should render FORMAT_CHANGE warnings', () => {
      const result: TranslationResult = {
        translatedMessage: 'test',
        sourceFormat: MessageFormat.MT,
        targetFormat: MessageFormat.MX,
        sourceType: MessageType.MT103,
        targetType: MessageType.PACS008,
        warnings: [
          {
            field_path: 'date',
            category: DataLossCategory.FORMAT_CHANGE,
            description: 'Date format changed',
          },
        ],
      };

      render(<TranslationPanel result={result} />);
      expect(screen.getByText('[Format Change]')).toBeInTheDocument();
    });
  });

  describe('MT message types', () => {
    it('should display MT103 type correctly', () => {
      const result: TranslationResult = {
        translatedMessage: 'test',
        sourceFormat: MessageFormat.MT,
        targetFormat: MessageFormat.MX,
        sourceType: MessageType.MT103,
        targetType: MessageType.PACS008,
        warnings: [],
      };

      render(<TranslationPanel result={result} />);
      expect(screen.getByText('MT103')).toBeInTheDocument();
    });

    it('should display MT202 type correctly', () => {
      const result: TranslationResult = {
        translatedMessage: 'test',
        sourceFormat: MessageFormat.MT,
        targetFormat: MessageFormat.MX,
        sourceType: MessageType.MT202,
        targetType: MessageType.PACS009,
        warnings: [],
      };

      render(<TranslationPanel result={result} />);
      expect(screen.getByText('MT202')).toBeInTheDocument();
    });

    it('should display MT940 type correctly', () => {
      const result: TranslationResult = {
        translatedMessage: 'test',
        sourceFormat: MessageFormat.MT,
        targetFormat: MessageFormat.MX,
        sourceType: MessageType.MT940,
        targetType: MessageType.CAMT053,
        warnings: [],
      };

      render(<TranslationPanel result={result} />);
      expect(screen.getByText('MT940')).toBeInTheDocument();
    });

    it('should display MT942 type correctly', () => {
      const result: TranslationResult = {
        translatedMessage: 'test',
        sourceFormat: MessageFormat.MT,
        targetFormat: MessageFormat.MX,
        sourceType: MessageType.MT942,
        targetType: MessageType.CAMT052,
        warnings: [],
      };

      render(<TranslationPanel result={result} />);
      expect(screen.getByText('MT942')).toBeInTheDocument();
    });
  });
});
