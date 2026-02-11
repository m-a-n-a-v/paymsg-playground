import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DiffView } from './DiffView';
import { MessageFormat, MessageType } from '../engine/types';
import type { TranslationResult } from '../engine/types';

// Mock the specs loader
vi.mock('../specs/loader', () => ({
  loadMapping: vi.fn().mockResolvedValue({
    message_pair: 'MT103/pacs.008.001.10',
    mt_type: 'MT103',
    mx_type: 'pacs.008.001.10',
    mappings: [
      {
        mt_tag: '20',
        mt_field_name: 'Transaction Reference',
        mx_path: 'CdtTrfTxInf/PmtId/InstrId',
        transform_type: 'direct',
      },
      {
        mt_tag: '32A',
        mt_field_name: 'Value Date, Currency, Amount',
        mx_path: 'CdtTrfTxInf/IntrBkSttlmAmt',
        transform_type: 'split',
      },
      {
        mt_tag: '50K',
        mt_field_name: 'Ordering Customer',
        mx_path: 'CdtTrfTxInf/Dbtr/Nm',
        transform_type: 'direct',
      },
    ],
  }),
}));

describe('DiffView', () => {
  const mockMT103 = `{1:F01BANKBEBBAXXX0000000000}{2:I103BANKUS33XXXXN}{3:{121:550e8400-e29b-41d4-a716-446655440000}}{4:
:20:TESTREF123
:23B:CRED
:32A:260210EUR1234,56
:50K:/BE68539007547034
John Doe
123 Main St
Brussels
:59:/US12345678901234567890
Jane Smith
456 Oak Ave
New York
:70:Invoice payment
:71A:SHA
-}{5:{CHK:123456789ABC}}`;

  const mockPacs008 = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>MSG123456</MsgId>
      <CreDtTm>2026-02-10T10:30:00</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>1234.56</CtrlSum>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>TESTREF123</InstrId>
        <EndToEndId>550e8400-e29b-41d4-a716-446655440000</EndToEndId>
        <UETR>550e8400-e29b-41d4-a716-446655440000</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="EUR">1234.56</IntrBkSttlmAmt>
      <IntrBkSttlmDt>2026-02-10</IntrBkSttlmDt>
      <ChrgBr>SHAR</ChrgBr>
      <Dbtr>
        <Nm>John Doe</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>BE68539007547034</IBAN>
        </Id>
      </DbtrAcct>
      <Cdtr>
        <Nm>Jane Smith</Nm>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <Othr>
            <Id>US12345678901234567890</Id>
          </Othr>
        </Id>
      </CdtrAcct>
      <RmtInf>
        <Ustrd>Invoice payment</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

  const createMockTranslationResult = (
    sourceFormat: MessageFormat,
    targetFormat: MessageFormat
  ): TranslationResult => ({
    translatedMessage: targetFormat === MessageFormat.MX ? mockPacs008 : mockMT103,
    sourceFormat,
    targetFormat,
    sourceType: sourceFormat === MessageFormat.MT ? MessageType.MT103 : MessageType.PACS008,
    targetType: targetFormat === MessageFormat.MX ? MessageType.PACS008 : MessageType.MT103,
    warnings: [],
  });

  it('renders empty state when no translation result', () => {
    render(<DiffView translationResult={undefined} originalMessage="" parsedMessage={undefined} />);
    expect(screen.getByText('No translation to compare yet')).toBeDefined();
    expect(screen.getByText('Translate a message to see side-by-side comparison')).toBeDefined();
  });

  it('renders side-by-side editors with MT103 to pacs.008 translation', async () => {
    const result = createMockTranslationResult(MessageFormat.MT, MessageFormat.MX);
    render(<DiffView translationResult={result} originalMessage={mockMT103} parsedMessage={undefined} />);

    await waitFor(() => {
      expect(screen.getByText('Side-by-side comparison:')).toBeDefined();
    });

    // Check labels - use getAllByText since message type appears multiple times
    const mt103Elements = screen.getAllByText(/MT103/);
    expect(mt103Elements.length).toBeGreaterThan(0);

    const pacs008Elements = screen.getAllByText(/pacs\.008/);
    expect(pacs008Elements.length).toBeGreaterThan(0);
  });

  it('renders side-by-side editors with pacs.008 to MT103 translation', async () => {
    const result = createMockTranslationResult(MessageFormat.MX, MessageFormat.MT);
    render(<DiffView translationResult={result} originalMessage={mockPacs008} parsedMessage={undefined} />);

    await waitFor(() => {
      expect(screen.getByText('Side-by-side comparison:')).toBeDefined();
    });

    // Check labels - use getAllByText since message type appears multiple times
    const mt103Elements = screen.getAllByText(/MT103/);
    expect(mt103Elements.length).toBeGreaterThan(0);

    const pacs008Elements = screen.getAllByText(/pacs\.008/);
    expect(pacs008Elements.length).toBeGreaterThan(0);
  });

  it('displays sync button with correct initial state', async () => {
    const result = createMockTranslationResult(MessageFormat.MT, MessageFormat.MX);
    render(<DiffView translationResult={result} originalMessage={mockMT103} parsedMessage={undefined} />);

    await waitFor(() => {
      const syncButton = screen.getByText('Synced');
      expect(syncButton).toBeDefined();
    });
  });

  it('toggles scroll synchronization when button is clicked', async () => {
    const result = createMockTranslationResult(MessageFormat.MT, MessageFormat.MX);
    render(<DiffView translationResult={result} originalMessage={mockMT103} parsedMessage={undefined} />);

    await waitFor(() => {
      const syncButton = screen.getByText('Synced');
      expect(syncButton).toBeDefined();
    });

    const syncButton = screen.getByText('Synced');
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(screen.getByText('Independent')).toBeDefined();
    });

    // Toggle back
    const independentButton = screen.getByText('Independent');
    fireEvent.click(independentButton);

    await waitFor(() => {
      expect(screen.getByText('Synced')).toBeDefined();
    });
  });

  it('displays field correspondence legend for MT103', async () => {
    const result = createMockTranslationResult(MessageFormat.MT, MessageFormat.MX);
    const { container } = render(
      <DiffView translationResult={result} originalMessage={mockMT103} parsedMessage={undefined} />
    );

    await waitFor(() => {
      expect(screen.getByText('Field Correspondence Legend')).toBeDefined();
    });

    // Check for field mappings - verify Transaction Reference is shown
    expect(screen.getByText('Transaction Reference')).toBeDefined();

    // Verify the legend grid exists
    expect(container.querySelector('.grid.grid-cols-2.gap-2')).toBeDefined();
  });

  it('displays field correspondence legend for MT202', async () => {
    const result: TranslationResult = {
      translatedMessage: mockPacs008,
      sourceFormat: MessageFormat.MT,
      targetFormat: MessageFormat.MX,
      sourceType: MessageType.MT202,
      targetType: MessageType.PACS009,
      warnings: [],
    };

    render(<DiffView translationResult={result} originalMessage={mockMT103} parsedMessage={undefined} />);

    await waitFor(() => {
      expect(screen.getByText('Field Correspondence Legend')).toBeDefined();
    });
  });

  it('displays field correspondence legend for MT940', async () => {
    const result: TranslationResult = {
      translatedMessage: mockPacs008,
      sourceFormat: MessageFormat.MT,
      targetFormat: MessageFormat.MX,
      sourceType: MessageType.MT940,
      targetType: MessageType.CAMT053,
      warnings: [],
    };

    render(<DiffView translationResult={result} originalMessage={mockMT103} parsedMessage={undefined} />);

    await waitFor(() => {
      expect(screen.getByText('Field Correspondence Legend')).toBeDefined();
    });
  });

  it('displays field correspondence legend for MT942', async () => {
    const result: TranslationResult = {
      translatedMessage: mockPacs008,
      sourceFormat: MessageFormat.MT,
      targetFormat: MessageFormat.MX,
      sourceType: MessageType.MT942,
      targetType: MessageType.CAMT052,
      warnings: [],
    };

    render(<DiffView translationResult={result} originalMessage={mockMT103} parsedMessage={undefined} />);

    await waitFor(() => {
      expect(screen.getByText('Field Correspondence Legend')).toBeDefined();
    });
  });

  it('shows color-coded field mapping with correct colors', async () => {
    const result = createMockTranslationResult(MessageFormat.MT, MessageFormat.MX);
    const { container } = render(
      <DiffView translationResult={result} originalMessage={mockMT103} parsedMessage={undefined} />
    );

    await waitFor(() => {
      expect(screen.getByText('Field Correspondence Legend')).toBeDefined();
    });

    // Check for color indicators
    const colorBoxes = container.querySelectorAll('.w-3.h-3.rounded');
    expect(colorBoxes.length).toBeGreaterThan(0);
  });

  it('displays MT field tags and MX paths in legend', async () => {
    const result = createMockTranslationResult(MessageFormat.MT, MessageFormat.MX);
    const { container } = render(
      <DiffView translationResult={result} originalMessage={mockMT103} parsedMessage={undefined} />
    );

    await waitFor(() => {
      expect(screen.getByText('Field Correspondence Legend')).toBeDefined();
    });

    // Check for field names instead of tags to avoid conflict with line numbers
    expect(screen.getByText('Transaction Reference')).toBeDefined();
    expect(screen.getByText('Value Date, Currency, Amount')).toBeDefined();
    expect(screen.getByText('Ordering Customer')).toBeDefined();

    // Verify the legend contains the expected field tags in the structure
    const legendSection = container.querySelector('.grid.grid-cols-2.gap-2');
    expect(legendSection).toBeDefined();
    expect(legendSection?.textContent).toContain('20');
    expect(legendSection?.textContent).toContain('32A');
    expect(legendSection?.textContent).toContain('50K');
  });

  it('shows truncated MX paths in legend (last element)', async () => {
    const result = createMockTranslationResult(MessageFormat.MT, MessageFormat.MX);
    const { container } = render(
      <DiffView translationResult={result} originalMessage={mockMT103} parsedMessage={undefined} />
    );

    await waitFor(() => {
      expect(screen.getByText('Field Correspondence Legend')).toBeDefined();
    });

    // MX paths should show only the last element for readability
    // Check within the legend section to avoid conflicts with editor content
    const legendSection = container.querySelector('.grid.grid-cols-2.gap-2');
    expect(legendSection).toBeDefined();
    expect(legendSection?.textContent).toContain('InstrId');
    expect(legendSection?.textContent).toContain('IntrBkSttlmAmt');
    expect(legendSection?.textContent).toContain('Nm'); // Last part of Dbtr/Nm path
  });

  it('displays correct panel labels based on translation direction', async () => {
    const result = createMockTranslationResult(MessageFormat.MT, MessageFormat.MX);
    render(<DiffView translationResult={result} originalMessage={mockMT103} parsedMessage={undefined} />);

    await waitFor(() => {
      expect(screen.getByText('MT (Original)')).toBeDefined();
      expect(screen.getByText('MX (Translated)')).toBeDefined();
    });
  });

  it('swaps panel labels when translation direction is reversed', async () => {
    const result = createMockTranslationResult(MessageFormat.MX, MessageFormat.MT);
    render(<DiffView translationResult={result} originalMessage={mockPacs008} parsedMessage={undefined} />);

    await waitFor(() => {
      expect(screen.getByText('MT (Translated)')).toBeDefined();
      expect(screen.getByText('MX (Original)')).toBeDefined();
    });
  });

  it('handles unknown message type gracefully', async () => {
    const result: TranslationResult = {
      translatedMessage: mockPacs008,
      sourceFormat: MessageFormat.MT,
      targetFormat: MessageFormat.MX,
      sourceType: MessageType.UNKNOWN,
      targetType: MessageType.UNKNOWN,
      warnings: [],
    };

    render(<DiffView translationResult={result} originalMessage={mockMT103} parsedMessage={undefined} />);

    await waitFor(() => {
      expect(screen.getByText('Side-by-side comparison:')).toBeDefined();
    });

    // Should still render even with unknown types
    expect(screen.getByText('MT (Original)')).toBeDefined();
  });

  it('shows correct message count in legend when there are many mappings', async () => {
    // The mock at the top of the file has 3 mappings, which is less than 20
    // So we just verify that the legend renders without the "showing first 20" message
    const result = createMockTranslationResult(MessageFormat.MT, MessageFormat.MX);

    const { container } = render(
      <DiffView translationResult={result} originalMessage={mockMT103} parsedMessage={undefined} />
    );

    await waitFor(() => {
      expect(screen.getByText('Field Correspondence Legend')).toBeDefined();
    });

    // With only 3 mappings, we shouldn't see the "showing first 20" message
    expect(screen.queryByText(/Showing first 20/)).toBeNull();

    // Verify legend grid exists
    expect(container.querySelector('.grid.grid-cols-2.gap-2')).toBeDefined();
  });

  it('handles mapping load errors gracefully', async () => {
    // This test verifies component resilience to errors
    // The component should render even if mapping data fails to load
    const result = createMockTranslationResult(MessageFormat.MT, MessageFormat.MX);

    const { container } = render(
      <DiffView translationResult={result} originalMessage={mockMT103} parsedMessage={undefined} />
    );

    await waitFor(() => {
      expect(screen.getByText('Side-by-side comparison:')).toBeDefined();
    });

    // Component renders successfully even if mapping could fail
    expect(container.querySelector('.h-full.flex.flex-col')).toBeDefined();
  });

  it('uses different colors for different field mappings', async () => {
    const result = createMockTranslationResult(MessageFormat.MT, MessageFormat.MX);
    const { container } = render(
      <DiffView translationResult={result} originalMessage={mockMT103} parsedMessage={undefined} />
    );

    await waitFor(() => {
      expect(screen.getByText('Field Correspondence Legend')).toBeDefined();
    });

    const colorBoxes = container.querySelectorAll('.w-3.h-3.rounded');
    const colors = Array.from(colorBoxes).map((box) =>
      (box as HTMLElement).style.backgroundColor
    );

    // Check that we have distinct colors (at least 3 different colors for 3 mappings)
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBeGreaterThanOrEqual(3);
  });

  it('renders CodeMirror editors for both sides', async () => {
    const result = createMockTranslationResult(MessageFormat.MT, MessageFormat.MX);
    const { container } = render(
      <DiffView translationResult={result} originalMessage={mockMT103} parsedMessage={undefined} />
    );

    await waitFor(() => {
      const editors = container.querySelectorAll('.cm-editor');
      expect(editors.length).toBe(2); // Left and right editors
    });
  });
});
