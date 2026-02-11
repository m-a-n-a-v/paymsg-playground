import { describe, it, expect } from 'vitest';
import { translateMessage } from './translator';
import { MessageFormat, MessageType, DataLossCategory } from './types';

describe('translator', () => {
  describe('MT103 to pacs.008 translation', () => {
    const sampleMt103 = `{1:F01BANKBICAXXX0000000000}{2:I103BANKBICAXXXXN}{3:{121:550e8400-e29b-41d4-a716-446655440000}}{4:
:20:TRF20260210001
:23B:CRED
:32A:260210EUR1234567,89
:50K:/DE89370400440532013000
ACME Corporation
123 Business Street
Berlin
:52A:DEUTDEFFXXX
:57A:BNPAFRPPXXX
:59:/FR1420041010050500013M02606
Beneficiary Name SA
456 Rue de Commerce
Paris
:70:Invoice INV-2024-001 Payment
:71A:SHA
-}{5:}`;

    it('should translate MT103 to pacs.008 successfully', async () => {
      const result = await translateMessage(sampleMt103, MessageFormat.MX);

      expect(result.sourceFormat).toBe(MessageFormat.MT);
      expect(result.targetFormat).toBe(MessageFormat.MX);
      expect(result.sourceType).toBe(MessageType.MT103);
      expect(result.targetType).toBe(MessageType.PACS008);
      expect(result.translatedMessage).toContain('<?xml');
      expect(result.translatedMessage).toContain('pacs.008.001.10');
      expect(result.translatedMessage).toContain('<FIToFICstmrCdtTrf>');
    });

    it('should map field 20 to InstrId', async () => {
      const result = await translateMessage(sampleMt103, MessageFormat.MX);

      expect(result.translatedMessage).toContain('<InstrId>TRF20260210001</InstrId>');
    });

    it('should map UETR from Block 3 tag 121', async () => {
      const result = await translateMessage(sampleMt103, MessageFormat.MX);

      expect(result.translatedMessage).toContain('<UETR>550e8400-e29b-41d4-a716-446655440000</UETR>');
      expect(result.translatedMessage).toContain('<EndToEndId>550e8400-e29b-41d4-a716-446655440000</EndToEndId>');
    });

    it('should use field 20 as EndToEndId when UETR is absent', async () => {
      const mt103NoUetr = sampleMt103.replace('{3:{121:550e8400-e29b-41d4-a716-446655440000}}', '');
      const result = await translateMessage(mt103NoUetr, MessageFormat.MX);

      expect(result.translatedMessage).toContain('<EndToEndId>TRF20260210001</EndToEndId>');
      expect(result.translatedMessage).not.toContain('<UETR>');
    });

    it('should map field 23B to LclInstrm/Prtry', async () => {
      const result = await translateMessage(sampleMt103, MessageFormat.MX);

      expect(result.translatedMessage).toContain('<LclInstrm>');
      expect(result.translatedMessage).toContain('<Prtry>CRED</Prtry>');
    });

    it('should convert field 32A date from YYMMDD to YYYY-MM-DD', async () => {
      const result = await translateMessage(sampleMt103, MessageFormat.MX);

      expect(result.translatedMessage).toContain('<IntrBkSttlmDt>2026-02-10</IntrBkSttlmDt>');
    });

    it('should convert field 32A amount with comma to period decimal', async () => {
      const result = await translateMessage(sampleMt103, MessageFormat.MX);

      expect(result.translatedMessage).toContain('<IntrBkSttlmAmt Ccy="EUR">1234567.89</IntrBkSttlmAmt>');
    });

    it('should handle dates with YY >= 50 as 19YY', async () => {
      const mt103Old = sampleMt103.replace(':32A:260210EUR', ':32A:500101EUR');
      const result = await translateMessage(mt103Old, MessageFormat.MX);

      expect(result.translatedMessage).toContain('<IntrBkSttlmDt>1950-01-01</IntrBkSttlmDt>');
    });

    it('should map field 71A charge bearer codes correctly', async () => {
      // SHA -> SHAR
      let result = await translateMessage(sampleMt103, MessageFormat.MX);
      expect(result.translatedMessage).toContain('<ChrgBr>SHAR</ChrgBr>');

      // BEN -> CRED
      const mt103Ben = sampleMt103.replace(':71A:SHA', ':71A:BEN');
      result = await translateMessage(mt103Ben, MessageFormat.MX);
      expect(result.translatedMessage).toContain('<ChrgBr>CRED</ChrgBr>');

      // OUR -> DEBT
      const mt103Our = sampleMt103.replace(':71A:SHA', ':71A:OUR');
      result = await translateMessage(mt103Our, MessageFormat.MX);
      expect(result.translatedMessage).toContain('<ChrgBr>DEBT</ChrgBr>');
    });

    it('should parse field 50K with account, name, and address', async () => {
      const result = await translateMessage(sampleMt103, MessageFormat.MX);

      expect(result.translatedMessage).toContain('<Dbtr>');
      expect(result.translatedMessage).toContain('<Nm>ACME Corporation</Nm>');
      expect(result.translatedMessage).toContain('<AdrLine>123 Business Street</AdrLine>');
      expect(result.translatedMessage).toContain('<AdrLine>Berlin</AdrLine>');
      expect(result.translatedMessage).toContain('<DbtrAcct>');
      expect(result.translatedMessage).toContain('<IBAN>DE89370400440532013000</IBAN>');
    });

    it('should parse field 50K without account', async () => {
      const mt103NoAccount = sampleMt103.replace(
        ':50K:/DE89370400440532013000\nACME Corporation',
        ':50K:ACME Corporation'
      );
      const result = await translateMessage(mt103NoAccount, MessageFormat.MX);

      expect(result.translatedMessage).toContain('<Nm>ACME Corporation</Nm>');
      expect(result.translatedMessage).not.toContain('<DbtrAcct>');
    });

    it('should detect IBAN format and use IBAN element', async () => {
      const result = await translateMessage(sampleMt103, MessageFormat.MX);

      expect(result.translatedMessage).toContain('<IBAN>DE89370400440532013000</IBAN>');
      expect(result.translatedMessage).toContain('<IBAN>FR1420041010050500013M02606</IBAN>');
    });

    it('should use Othr/Id for non-IBAN accounts', async () => {
      const mt103NonIban = sampleMt103.replace(
        '/DE89370400440532013000',
        '/123456789'
      );
      const result = await translateMessage(mt103NonIban, MessageFormat.MX);

      expect(result.translatedMessage).toContain('<Othr>');
      expect(result.translatedMessage).toContain('<Id>123456789</Id>');
    });

    it('should map field 52A to DbtrAgt/FinInstnId/BICFI', async () => {
      const result = await translateMessage(sampleMt103, MessageFormat.MX);

      expect(result.translatedMessage).toContain('<DbtrAgt>');
      expect(result.translatedMessage).toContain('<BICFI>DEUTDEFFXXX</BICFI>');
    });

    it('should map field 57A to CdtrAgt/FinInstnId/BICFI', async () => {
      const result = await translateMessage(sampleMt103, MessageFormat.MX);

      expect(result.translatedMessage).toContain('<CdtrAgt>');
      expect(result.translatedMessage).toContain('<BICFI>BNPAFRPPXXX</BICFI>');
    });

    it('should parse field 59 with account, name, and address', async () => {
      const result = await translateMessage(sampleMt103, MessageFormat.MX);

      expect(result.translatedMessage).toContain('<Cdtr>');
      expect(result.translatedMessage).toContain('<Nm>Beneficiary Name SA</Nm>');
      expect(result.translatedMessage).toContain('<AdrLine>456 Rue de Commerce</AdrLine>');
      expect(result.translatedMessage).toContain('<AdrLine>Paris</AdrLine>');
      expect(result.translatedMessage).toContain('<CdtrAcct>');
    });

    it('should map field 70 remittance information', async () => {
      const result = await translateMessage(sampleMt103, MessageFormat.MX);

      expect(result.translatedMessage).toContain('<RmtInf>');
      expect(result.translatedMessage).toContain('<Ustrd>Invoice INV-2024-001 Payment</Ustrd>');
    });

    it('should concatenate multi-line field 70', async () => {
      const mt103MultiLine = sampleMt103.replace(
        ':70:Invoice INV-2024-001 Payment',
        ':70:Invoice INV-2024-001\nPayment for services\nJanuary 2024'
      );
      const result = await translateMessage(mt103MultiLine, MessageFormat.MX);

      expect(result.translatedMessage).toContain('<Ustrd>Invoice INV-2024-001 Payment for services January 2024</Ustrd>');
    });

    it('should generate GrpHdr with MsgId and CreDtTm', async () => {
      const result = await translateMessage(sampleMt103, MessageFormat.MX);

      expect(result.translatedMessage).toContain('<GrpHdr>');
      expect(result.translatedMessage).toContain('<MsgId>');
      expect(result.translatedMessage).toContain('<CreDtTm>');
      expect(result.translatedMessage).toContain('<NbOfTxs>1</NbOfTxs>');
    });

    it('should include CtrlSum in GrpHdr', async () => {
      const result = await translateMessage(sampleMt103, MessageFormat.MX);

      expect(result.translatedMessage).toContain('<CtrlSum>1234567.89</CtrlSum>');
    });

    it('should generate valid XML structure', async () => {
      const result = await translateMessage(sampleMt103, MessageFormat.MX);

      // Parse XML to verify it's valid
      const parser = new DOMParser();
      const doc = parser.parseFromString(result.translatedMessage, 'text/xml');

      // Check for parsing errors
      const errorNode = doc.querySelector('parsererror');
      expect(errorNode).toBeNull();

      // Verify root element
      expect(doc.documentElement.localName).toBe('Document');
    });

    it('should escape XML special characters', async () => {
      const mt103Special = sampleMt103.replace(
        'ACME Corporation',
        'ACME & Sons <Corporation>'
      );
      const result = await translateMessage(mt103Special, MessageFormat.MX);

      expect(result.translatedMessage).toContain('&amp;');
      expect(result.translatedMessage).toContain('&lt;');
      expect(result.translatedMessage).toContain('&gt;');
    });

    it('should warn about MT-only fields', async () => {
      // Add field 53A (Sender's Correspondent) which has no MX equivalent
      const mt103WithField53 = sampleMt103.replace(
        ':52A:DEUTDEFFXXX',
        ':52A:DEUTDEFFXXX\n:53A:CORRBANKXXX'
      );
      const result = await translateMessage(mt103WithField53, MessageFormat.MX);

      expect(result.warnings.length).toBeGreaterThan(0);
      const warning = result.warnings.find(w => w.field_path.includes('53'));
      expect(warning).toBeDefined();
      expect(warning?.category).toBe('NoEquivalent');
    });
  });

  describe('pacs.008 to MT103 translation', () => {
    const samplePacs008 = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>MSG-20260210-001</MsgId>
      <CreDtTm>2026-02-10T10:30:00Z</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>2500.00</CtrlSum>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>INSTR123456</InstrId>
        <EndToEndId>E2E-REF-001</EndToEndId>
        <UETR>550e8400-e29b-41d4-a716-446655440000</UETR>
      </PmtId>
      <PmtTpInf>
        <LclInstrm>
          <Prtry>CRED</Prtry>
        </LclInstrm>
      </PmtTpInf>
      <IntrBkSttlmDt>2026-02-10</IntrBkSttlmDt>
      <IntrBkSttlmAmt Ccy="EUR">2500.00</IntrBkSttlmAmt>
      <ChrgBr>SHAR</ChrgBr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>DEUTDEFFXXX</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <Dbtr>
        <Nm>Sender Company Ltd</Nm>
        <PstlAdr>
          <AdrLine>100 Main Street</AdrLine>
          <AdrLine>Frankfurt</AdrLine>
        </PstlAdr>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>DE89370400440532013000</IBAN>
        </Id>
      </DbtrAcct>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>BNPAFRPPXXX</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>Receiver Corp SA</Nm>
        <PstlAdr>
          <AdrLine>200 Commerce Ave</AdrLine>
          <AdrLine>Paris</AdrLine>
        </PstlAdr>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>FR1420041010050500013M02606</IBAN>
        </Id>
      </CdtrAcct>
      <RmtInf>
        <Ustrd>Payment for invoice 2024-INV-001</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

    it('should translate pacs.008 to MT103 successfully', async () => {
      const result = await translateMessage(samplePacs008, MessageFormat.MT);

      expect(result.sourceFormat).toBe(MessageFormat.MX);
      expect(result.targetFormat).toBe(MessageFormat.MT);
      expect(result.sourceType).toBe(MessageType.PACS008);
      expect(result.targetType).toBe(MessageType.MT103);
      expect(result.translatedMessage).toContain('{1:');
      expect(result.translatedMessage).toContain('{2:I103');
      expect(result.translatedMessage).toContain('{4:');
    });

    it('should map InstrId to field 20', async () => {
      const result = await translateMessage(samplePacs008, MessageFormat.MT);

      expect(result.translatedMessage).toContain(':20:INSTR123456');
    });

    it('should truncate long InstrId to 16 chars for field 20', async () => {
      const pacs008LongId = samplePacs008.replace(
        '<InstrId>INSTR123456</InstrId>',
        '<InstrId>VERYLONGINSTRUCTIONIDENTIFIER123456</InstrId>'
      );
      const result = await translateMessage(pacs008LongId, MessageFormat.MT);

      expect(result.translatedMessage).toContain(':20:VERYLONGINSTRUCT');
      expect(result.warnings.length).toBeGreaterThan(0);
      const warning = result.warnings.find(w => w.category === DataLossCategory.TRUNCATION);
      expect(warning).toBeDefined();
    });

    it('should map UETR to Block 3 tag 121', async () => {
      const result = await translateMessage(samplePacs008, MessageFormat.MT);

      expect(result.translatedMessage).toContain('{3:{121:550e8400-e29b-41d4-a716-446655440000}}');
    });

    it('should omit Block 3 when UETR is absent', async () => {
      const pacs008NoUetr = samplePacs008.replace(
        '<UETR>550e8400-e29b-41d4-a716-446655440000</UETR>',
        ''
      );
      const result = await translateMessage(pacs008NoUetr, MessageFormat.MT);

      expect(result.translatedMessage).not.toContain('{3:');
    });

    it('should map LclInstrm/Prtry to field 23B', async () => {
      const result = await translateMessage(samplePacs008, MessageFormat.MT);

      expect(result.translatedMessage).toContain(':23B:CRED');
    });

    it('should convert IntrBkSttlmDt from YYYY-MM-DD to YYMMDD', async () => {
      const result = await translateMessage(samplePacs008, MessageFormat.MT);

      expect(result.translatedMessage).toContain(':32A:260210EUR2500,00');
    });

    it('should convert amount from period to comma decimal', async () => {
      const result = await translateMessage(samplePacs008, MessageFormat.MT);

      expect(result.translatedMessage).toContain('EUR2500,00');
    });

    it('should map ChrgBr codes correctly', async () => {
      // SHAR -> SHA
      let result = await translateMessage(samplePacs008, MessageFormat.MT);
      expect(result.translatedMessage).toContain(':71A:SHA');

      // CRED -> BEN
      const pacs008Cred = samplePacs008.replace('<ChrgBr>SHAR</ChrgBr>', '<ChrgBr>CRED</ChrgBr>');
      result = await translateMessage(pacs008Cred, MessageFormat.MT);
      expect(result.translatedMessage).toContain(':71A:BEN');

      // DEBT -> OUR
      const pacs008Debt = samplePacs008.replace('<ChrgBr>SHAR</ChrgBr>', '<ChrgBr>DEBT</ChrgBr>');
      result = await translateMessage(pacs008Debt, MessageFormat.MT);
      expect(result.translatedMessage).toContain(':71A:OUR');
    });

    it('should map Dbtr to field 50K with account, name, and address', async () => {
      const result = await translateMessage(samplePacs008, MessageFormat.MT);

      expect(result.translatedMessage).toContain(':50K:/DE89370400440532013000');
      expect(result.translatedMessage).toContain('Sender Company Ltd');
      expect(result.translatedMessage).toContain('100 Main Street');
      expect(result.translatedMessage).toContain('Frankfurt');
    });

    it('should handle IBAN in DbtrAcct', async () => {
      const result = await translateMessage(samplePacs008, MessageFormat.MT);

      expect(result.translatedMessage).toContain('/DE89370400440532013000');
    });

    it('should handle non-IBAN account in DbtrAcct', async () => {
      const pacs008NonIban = samplePacs008.replace(
        '<IBAN>DE89370400440532013000</IBAN>',
        '<Othr><Id>123456789</Id></Othr>'
      );
      const result = await translateMessage(pacs008NonIban, MessageFormat.MT);

      expect(result.translatedMessage).toContain('/123456789');
    });

    it('should map DbtrAgt to field 52A', async () => {
      const result = await translateMessage(samplePacs008, MessageFormat.MT);

      expect(result.translatedMessage).toContain(':52A:DEUTDEFFXXX');
    });

    it('should map CdtrAgt to field 57A', async () => {
      const result = await translateMessage(samplePacs008, MessageFormat.MT);

      expect(result.translatedMessage).toContain(':57A:BNPAFRPPXXX');
    });

    it('should map Cdtr to field 59 with account, name, and address', async () => {
      const result = await translateMessage(samplePacs008, MessageFormat.MT);

      expect(result.translatedMessage).toContain(':59:/FR1420041010050500013M02606');
      expect(result.translatedMessage).toContain('Receiver Corp SA');
      expect(result.translatedMessage).toContain('200 Commerce Ave');
      expect(result.translatedMessage).toContain('Paris');
    });

    it('should map RmtInf/Ustrd to field 70', async () => {
      const result = await translateMessage(samplePacs008, MessageFormat.MT);

      expect(result.translatedMessage).toContain(':70:Payment for invoice 2024-INV-001');
    });

    it('should build proper MT103 structure', async () => {
      const result = await translateMessage(samplePacs008, MessageFormat.MT);

      expect(result.translatedMessage).toContain('{1:F01BANKBICAXXX0000000000}');
      expect(result.translatedMessage).toContain('{2:I103BANKBICAXXXXN}');
      expect(result.translatedMessage).toContain('{4:');
      expect(result.translatedMessage).toContain('-}');
      expect(result.translatedMessage).toContain('{5:}');
    });

    it('should handle missing optional fields gracefully', async () => {
      const pacs008Minimal = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>MSG-001</MsgId>
      <CreDtTm>2026-02-10T10:30:00Z</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>INS001</InstrId>
        <EndToEndId>E2E001</EndToEndId>
      </PmtId>
      <IntrBkSttlmDt>2026-02-10</IntrBkSttlmDt>
      <IntrBkSttlmAmt Ccy="USD">1000.00</IntrBkSttlmAmt>
      <ChrgBr>SHAR</ChrgBr>
      <Dbtr>
        <Nm>Sender Name</Nm>
      </Dbtr>
      <Cdtr>
        <Nm>Receiver Name</Nm>
      </Cdtr>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

      const result = await translateMessage(pacs008Minimal, MessageFormat.MT);

      expect(result.translatedMessage).toContain(':20:INS001');
      expect(result.translatedMessage).toContain(':32A:260210USD1000,00');
      expect(result.translatedMessage).toContain('Sender Name');
      expect(result.translatedMessage).toContain('Receiver Name');
    });
  });

  describe('error handling', () => {
    it('should throw error for same source and target format (MT to MT)', async () => {
      const mt103 = '{1:F01BANKBICAXXX0000000000}{2:I103BANKBICAXXXXN}{4:\n:20:REF\n-}{5:}';

      await expect(
        translateMessage(mt103, MessageFormat.MT)
      ).rejects.toThrow('Source and target formats cannot both be MT');
    });

    it('should throw error for same source and target format (MX to MX)', async () => {
      const pacs008 = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10">
  <FIToFICstmrCdtTrf>
    <GrpHdr><MsgId>MSG001</MsgId><CreDtTm>2026-02-10T10:30:00Z</CreDtTm><NbOfTxs>1</NbOfTxs></GrpHdr>
  </FIToFICstmrCdtTrf>
</Document>`;

      await expect(
        translateMessage(pacs008, MessageFormat.MX)
      ).rejects.toThrow('Source and target formats cannot both be MX');
    });

    it('should throw error for unsupported MT message types', async () => {
      const mt202 = '{1:F01BANKBICAXXX0000000000}{2:I202BANKBICAXXXXN}{4:\n:20:REF\n-}{5:}';

      await expect(
        translateMessage(mt202, MessageFormat.MX)
      ).rejects.toThrow('Translation from MT202 to MX not yet supported');
    });

    it('should throw error for unsupported MX message types', async () => {
      const pacs009 = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.009.001.10">
  <FICdtTrf>
    <GrpHdr><MsgId>MSG001</MsgId><CreDtTm>2026-02-10T10:30:00Z</CreDtTm><NbOfTxs>1</NbOfTxs></GrpHdr>
  </FICdtTrf>
</Document>`;

      await expect(
        translateMessage(pacs009, MessageFormat.MT)
      ).rejects.toThrow('Translation from urn:iso:std:iso:20022:tech:xsd:pacs.009.001.10 to MT not yet supported');
    });
  });

  describe('round-trip translation', () => {
    it('should preserve key fields in MT103 -> pacs.008 -> MT103 round-trip', async () => {
      const originalMt103 = `{1:F01BANKBICAXXX0000000000}{2:I103BANKBICAXXXXN}{4:
:20:REF123
:23B:CRED
:32A:260210EUR5000,00
:50K:/DE89370400440532013000
Test Sender
:52A:DEUTDEFFXXX
:57A:BNPAFRPPXXX
:59:/FR1420041010050500013M02606
Test Receiver
:70:Test payment
:71A:SHA
-}{5:}`;

      // MT103 -> pacs.008
      const step1 = await translateMessage(originalMt103, MessageFormat.MX);
      expect(step1.targetFormat).toBe(MessageFormat.MX);

      // pacs.008 -> MT103
      const step2 = await translateMessage(step1.translatedMessage, MessageFormat.MT);
      expect(step2.targetFormat).toBe(MessageFormat.MT);

      // Verify key fields preserved
      expect(step2.translatedMessage).toContain(':20:REF123');
      expect(step2.translatedMessage).toContain(':23B:CRED');
      expect(step2.translatedMessage).toContain(':32A:260210EUR5000,00');
      expect(step2.translatedMessage).toContain('Test Sender');
      expect(step2.translatedMessage).toContain('Test Receiver');
      expect(step2.translatedMessage).toContain(':70:Test payment');
      expect(step2.translatedMessage).toContain(':71A:SHA');
    });
  });
});
