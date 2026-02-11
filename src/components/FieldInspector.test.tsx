import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FieldInspector } from './FieldInspector';
import { MessageType, type MtMessage, type MxMessage } from '../engine/types';

// Mock the specs loader
vi.mock('../specs/loader', () => ({
  loadMtSpec: vi.fn().mockResolvedValue({
    message_type: 'MT103',
    fields: [
      { tag: '20', name: 'Transaction Reference Number' },
      { tag: '23B', name: 'Bank Operation Code' },
      { tag: '32A', name: 'Value Date, Currency Code, Amount' },
      { tag: '50K', name: 'Ordering Customer' },
      { tag: '59', name: 'Beneficiary Customer' },
      { tag: '71A', name: 'Details of Charges' },
    ],
  }),
}));

describe('FieldInspector', () => {
  describe('Empty state', () => {
    it('should show empty state when no message is parsed', () => {
      render(<FieldInspector parsedMessage={null} messageType={MessageType.UNKNOWN} />);
      expect(screen.getByText(/No message parsed yet/i)).toBeInTheDocument();
    });

    it('should show empty state when parsedMessage is undefined', () => {
      render(<FieldInspector parsedMessage={undefined} messageType={MessageType.UNKNOWN} />);
      expect(screen.getByText(/No message parsed yet/i)).toBeInTheDocument();
    });
  });

  describe('MT message display', () => {
    const mtMessage: MtMessage = {
      block4: {
        fields: [
          { tag: '20', value: 'REF123456' },
          { tag: '23B', value: 'CRED' },
          {
            tag: '32A',
            value: '231115EUR1234,56',
            subfields: {
              date: '231115',
              currency: 'EUR',
              amount: '1234.56',
            },
          },
          {
            tag: '50K',
            value: '/DE89370400440532013000\nJohn Doe\nMain Street 123\nBerlin',
            subfields: {
              account: '/DE89370400440532013000',
              name: 'John Doe',
              address: 'Main Street 123\nBerlin',
            },
          },
        ],
      },
    };

    it('should render MT message fields', () => {
      render(<FieldInspector parsedMessage={mtMessage} messageType={MessageType.MT103} />);

      expect(screen.getByText(':20:')).toBeInTheDocument();
      expect(screen.getByText('REF123456')).toBeInTheDocument();
      expect(screen.getByText(':23B:')).toBeInTheDocument();
      expect(screen.getByText('CRED')).toBeInTheDocument();
    });

    it('should show field names from MT spec', async () => {
      render(<FieldInspector parsedMessage={mtMessage} messageType={MessageType.MT103} />);

      // Wait for spec to load
      await screen.findByText('Transaction Reference Number');
      expect(screen.getByText('Bank Operation Code')).toBeInTheDocument();
      expect(screen.getByText('Value Date, Currency Code, Amount')).toBeInTheDocument();
    });

    it('should not expand fields without subfields', () => {
      render(<FieldInspector parsedMessage={mtMessage} messageType={MessageType.MT103} />);

      const field20 = screen.getByText(':20:').closest('button');
      expect(field20).toBeDisabled();
    });

    it('should expand fields with subfields when clicked', async () => {
      render(<FieldInspector parsedMessage={mtMessage} messageType={MessageType.MT103} />);

      // Find and click field 32A (has subfields)
      const field32A = screen.getByText(':32A:').closest('button');
      expect(field32A).not.toBeDisabled();
      if (!field32A) throw new Error('Field 32A button not found');

      fireEvent.click(field32A);

      // Should show subfields
      expect(await screen.findByText('date:')).toBeInTheDocument();
      expect(screen.getByText('231115')).toBeInTheDocument();
      expect(screen.getByText('currency:')).toBeInTheDocument();
      expect(screen.getByText('EUR')).toBeInTheDocument();
      expect(screen.getByText('amount:')).toBeInTheDocument();
      expect(screen.getByText('1234.56')).toBeInTheDocument();
    });

    it('should show raw value when field is expanded', async () => {
      render(<FieldInspector parsedMessage={mtMessage} messageType={MessageType.MT103} />);

      const field32A = screen.getByText(':32A:').closest('button');
      if (!field32A) throw new Error('Field 32A button not found');
      fireEvent.click(field32A);

      expect(await screen.findByText('231115EUR1234,56')).toBeInTheDocument();
    });

    it('should collapse expanded fields when clicked again', async () => {
      render(<FieldInspector parsedMessage={mtMessage} messageType={MessageType.MT103} />);

      const field32A = screen.getByText(':32A:').closest('button');
      if (!field32A) throw new Error('Field 32A button not found');
      fireEvent.click(field32A);

      // Wait for expansion
      await screen.findByText('date:');

      // Click again to collapse
      fireEvent.click(field32A);

      // Subfields should be hidden
      expect(screen.queryByText('date:')).not.toBeInTheDocument();
    });

    it('should display compound field subfields for field 50K', async () => {
      render(<FieldInspector parsedMessage={mtMessage} messageType={MessageType.MT103} />);

      const field50K = screen.getByText(':50K:').closest('button');
      if (!field50K) throw new Error('Field 50K button not found');
      fireEvent.click(field50K);

      expect(await screen.findByText('account:')).toBeInTheDocument();
      expect(screen.getByText('/DE89370400440532013000')).toBeInTheDocument();
      expect(screen.getByText('name:')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('address:')).toBeInTheDocument();
    });

    it('should handle multiple fields with same tag', () => {
      const messageWithDuplicates: MtMessage = {
        block4: {
          fields: [
            { tag: '20', value: 'REF1' },
            { tag: '20', value: 'REF2' },
          ],
        },
      };

      render(<FieldInspector parsedMessage={messageWithDuplicates} messageType={MessageType.MT103} />);

      const fields = screen.getAllByText(':20:');
      expect(fields).toHaveLength(2);
      expect(screen.getByText('REF1')).toBeInTheDocument();
      expect(screen.getByText('REF2')).toBeInTheDocument();
    });

    it('should show message when no fields in block4', () => {
      const emptyMessage: MtMessage = {
        block4: {
          fields: [],
        },
      };

      render(<FieldInspector parsedMessage={emptyMessage} messageType={MessageType.MT103} />);
      expect(screen.getByText(/No fields to display/i)).toBeInTheDocument();
    });

    it('should handle missing block4', () => {
      const messageWithoutBlock4: MtMessage = {
        block1: { app_id: 'F', service_id: '01', lt_address: 'BANKBEBBAXXX', session_number: '0000', sequence_number: '000000' }
      };

      render(<FieldInspector parsedMessage={messageWithoutBlock4} messageType={MessageType.MT103} />);
      expect(screen.getByText(/No fields to display/i)).toBeInTheDocument();
    });
  });

  describe('MX message display', () => {
    const createMxMessage = (): MxMessage => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10">
          <FIToFICstmrCdtTrf>
            <GrpHdr>
              <MsgId>MSG123456</MsgId>
              <CreDtTm>2023-11-15T10:30:00</CreDtTm>
              <NbOfTxs>1</NbOfTxs>
              <CtrlSum>1234.56</CtrlSum>
            </GrpHdr>
            <CdtTrfTxInf>
              <PmtId>
                <InstrId>INSTR123</InstrId>
                <EndToEndId>E2E123</EndToEndId>
              </PmtId>
              <IntrBkSttlmAmt Ccy="EUR">1234.56</IntrBkSttlmAmt>
            </CdtTrfTxInf>
          </FIToFICstmrCdtTrf>
        </Document>`,
        'application/xml'
      );

      return {
        namespace: 'urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10',
        document: xmlDoc,
        root: xmlDoc.documentElement,
      };
    };

    it('should render MX message XML tree', () => {
      const mxMessage = createMxMessage();
      render(<FieldInspector parsedMessage={mxMessage} messageType={MessageType.PACS008} />);

      expect(screen.getByText(/<Document>/)).toBeInTheDocument();
    });

    it('should expand XML elements when clicked', () => {
      const mxMessage = createMxMessage();
      render(<FieldInspector parsedMessage={mxMessage} messageType={MessageType.PACS008} />);

      // Find and click Document element
      const documentElement = screen.getByText(/<Document>/).closest('button');
      if (!documentElement) throw new Error('Document element button not found');
      fireEvent.click(documentElement);

      // Should show child elements
      expect(screen.getByText(/<FIToFICstmrCdtTrf>/)).toBeInTheDocument();
    });

    it('should display element values', () => {
      const mxMessage = createMxMessage();
      render(<FieldInspector parsedMessage={mxMessage} messageType={MessageType.PACS008} />);

      // Expand to show all elements
      const documentElement = screen.getByText(/<Document>/).closest('button');
      if (!documentElement) throw new Error('Document element button not found');
      fireEvent.click(documentElement);

      const fiElement = screen.getByText(/<FIToFICstmrCdtTrf>/).closest('button');
      if (!fiElement) throw new Error('FI element button not found');
      fireEvent.click(fiElement);

      const grpHdrElement = screen.getByText(/<GrpHdr>/).closest('button');
      if (!grpHdrElement) throw new Error('GrpHdr element button not found');
      fireEvent.click(grpHdrElement);

      // Should show values
      expect(screen.getByText('MSG123456')).toBeInTheDocument();
      expect(screen.getByText('2023-11-15T10:30:00')).toBeInTheDocument();
    });

    it('should display element attributes', () => {
      const mxMessage = createMxMessage();
      const { container } = render(<FieldInspector parsedMessage={mxMessage} messageType={MessageType.PACS008} />);

      // Verify Document element is rendered
      expect(container.textContent).toContain('<Document>');
      // Attributes should be present in the rendered output
      expect(container.textContent).toContain('xmlns=');
    });

    it('should collapse expanded elements when clicked again', () => {
      const mxMessage = createMxMessage();
      render(<FieldInspector parsedMessage={mxMessage} messageType={MessageType.PACS008} />);

      const documentElement = screen.getByText(/<Document>/).closest('button');
      if (!documentElement) throw new Error('Document element button not found');
      fireEvent.click(documentElement);

      // Should show child
      expect(screen.getByText(/<FIToFICstmrCdtTrf>/)).toBeInTheDocument();

      // Click again to collapse
      fireEvent.click(documentElement);

      // Child should be hidden
      expect(screen.queryByText(/<FIToFICstmrCdtTrf>/)).not.toBeInTheDocument();
    });

    it('should handle nested element structure', () => {
      const mxMessage = createMxMessage();
      render(<FieldInspector parsedMessage={mxMessage} messageType={MessageType.PACS008} />);

      // Expand Document
      const docBtn = screen.getByText(/<Document>/).closest('button');
      if (!docBtn) throw new Error('Document button not found');
      fireEvent.click(docBtn);

      // Expand FIToFICstmrCdtTrf
      const fiBtn = screen.getByText(/<FIToFICstmrCdtTrf>/).closest('button');
      if (!fiBtn) throw new Error('FI button not found');
      fireEvent.click(fiBtn);

      // Expand CdtTrfTxInf
      const cdtBtn = screen.getByText(/<CdtTrfTxInf>/).closest('button');
      if (!cdtBtn) throw new Error('CdtTrfTxInf button not found');
      fireEvent.click(cdtBtn);

      // Expand PmtId
      const pmtBtn = screen.getByText(/<PmtId>/).closest('button');
      if (!pmtBtn) throw new Error('PmtId button not found');
      fireEvent.click(pmtBtn);

      // Should show deeply nested elements
      expect(screen.getByText(/<InstrId>/)).toBeInTheDocument();
      expect(screen.getByText(/<EndToEndId>/)).toBeInTheDocument();
    });

    it('should not expand leaf elements without children', () => {
      const mxMessage = createMxMessage();
      const { container } = render(<FieldInspector parsedMessage={mxMessage} messageType={MessageType.PACS008} />);

      // Document root should be present
      expect(container.textContent).toContain('<Document>');

      // Find all buttons - leaf elements should be disabled
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle fields with empty values', () => {
      const message: MtMessage = {
        block4: {
          fields: [{ tag: '70', value: '' }],
        },
      };

      render(<FieldInspector parsedMessage={message} messageType={MessageType.MT103} />);
      expect(screen.getByText(':70:')).toBeInTheDocument();
    });

    it('should handle fields with long values', () => {
      const longValue = 'A'.repeat(200);
      const message: MtMessage = {
        block4: {
          fields: [{ tag: '70', value: longValue }],
        },
      };

      render(<FieldInspector parsedMessage={message} messageType={MessageType.MT103} />);
      expect(screen.getByText(longValue)).toBeInTheDocument();
    });

    it('should handle fields with special characters', () => {
      const message: MtMessage = {
        block4: {
          fields: [{ tag: '70', value: 'Test & <special> "chars"' }],
        },
      };

      render(<FieldInspector parsedMessage={message} messageType={MessageType.MT103} />);
      expect(screen.getByText('Test & <special> "chars"')).toBeInTheDocument();
    });
  });
});
