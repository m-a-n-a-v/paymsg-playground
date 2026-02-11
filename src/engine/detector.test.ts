import { describe, it, expect } from 'vitest';
import {
  detectMessage,
  isMtFormat,
  isMxFormat,
  getMessageTypeName,
} from './detector';
import { MessageFormat, MessageType } from './types';

describe('detectMessage', () => {
  describe('MT message detection', () => {
    it('should detect MT103 format', () => {
      const message = `{1:F01BANKBICAXXX0000000000}{2:I103BANKBICAXXXXN}{4:
:20:REF123
:32A:260211EUR1234,56
-}`;
      const result = detectMessage(message);
      expect(result.format).toBe(MessageFormat.MT);
      expect(result.messageType).toBe(MessageType.MT103);
      expect(result.confidence).toBe(1.0);
    });

    it('should detect MT202 format', () => {
      const message = `{1:F01BANKBICAXXX0000000000}{2:I202BANKBICAXXXXN}{4:
:20:REF456
:32A:260211USD10000,00
-}`;
      const result = detectMessage(message);
      expect(result.format).toBe(MessageFormat.MT);
      expect(result.messageType).toBe(MessageType.MT202);
      expect(result.confidence).toBe(1.0);
    });

    it('should detect MT940 format', () => {
      const message = `{1:F01BANKBICAXXX0000000000}{2:I940BANKBICAXXXXN}{4:
:20:STMT123
:25:12345678
:60F:C260210EUR1000,00
-}`;
      const result = detectMessage(message);
      expect(result.format).toBe(MessageFormat.MT);
      expect(result.messageType).toBe(MessageType.MT940);
      expect(result.confidence).toBe(1.0);
    });

    it('should detect MT942 format', () => {
      const message = `{1:F01BANKBICAXXX0000000000}{2:I942BANKBICAXXXXN}{4:
:20:INTERIM123
:25:12345678
-}`;
      const result = detectMessage(message);
      expect(result.format).toBe(MessageFormat.MT);
      expect(result.messageType).toBe(MessageType.MT942);
      expect(result.confidence).toBe(1.0);
    });

    it('should detect MT format with Output block 2', () => {
      const message = `{1:F01BANKBICAXXX0000000000}{2:O1031234567890BANKBICAXXX12345678901234567890N}{4:
:20:REF789
-}`;
      const result = detectMessage(message);
      expect(result.format).toBe(MessageFormat.MT);
      expect(result.messageType).toBe(MessageType.MT103);
      expect(result.confidence).toBe(1.0);
    });

    it('should detect MT format but unknown type for unsupported message', () => {
      const message = `{1:F01BANKBICAXXX0000000000}{2:I999BANKBICAXXXXN}{4:
:20:REF999
-}`;
      const result = detectMessage(message);
      expect(result.format).toBe(MessageFormat.MT);
      expect(result.messageType).toBe(MessageType.UNKNOWN);
      expect(result.confidence).toBe(0.7);
    });

    it('should detect MT format even without block 2', () => {
      const message = `{1:F01BANKBICAXXX0000000000}{4:
:20:REF000
-}`;
      const result = detectMessage(message);
      expect(result.format).toBe(MessageFormat.MT);
      expect(result.messageType).toBe(MessageType.UNKNOWN);
      expect(result.confidence).toBe(0.7);
    });
  });

  describe('MX message detection', () => {
    it('should detect pacs.008 format with XML declaration', () => {
      const message = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>MSG123</MsgId>
    </GrpHdr>
  </FIToFICstmrCdtTrf>
</Document>`;
      const result = detectMessage(message);
      expect(result.format).toBe(MessageFormat.MX);
      expect(result.messageType).toBe(MessageType.PACS008);
      expect(result.confidence).toBe(1.0);
    });

    it('should detect pacs.009 format', () => {
      const message = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.009.001.10">
  <FICdtTrf>
    <GrpHdr>
      <MsgId>MSG456</MsgId>
    </GrpHdr>
  </FICdtTrf>
</Document>`;
      const result = detectMessage(message);
      expect(result.format).toBe(MessageFormat.MX);
      expect(result.messageType).toBe(MessageType.PACS009);
      expect(result.confidence).toBe(1.0);
    });

    it('should detect camt.053 format', () => {
      const message = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.10">
  <BkToCstmrStmt>
    <GrpHdr>
      <MsgId>STMT789</MsgId>
    </GrpHdr>
  </BkToCstmrStmt>
</Document>`;
      const result = detectMessage(message);
      expect(result.format).toBe(MessageFormat.MX);
      expect(result.messageType).toBe(MessageType.CAMT053);
      expect(result.confidence).toBe(1.0);
    });

    it('should detect camt.052 format', () => {
      const message = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.052.001.10">
  <BkToCstmrAcctRpt>
    <GrpHdr>
      <MsgId>INTERIM999</MsgId>
    </GrpHdr>
  </BkToCstmrAcctRpt>
</Document>`;
      const result = detectMessage(message);
      expect(result.format).toBe(MessageFormat.MX);
      expect(result.messageType).toBe(MessageType.CAMT052);
      expect(result.confidence).toBe(1.0);
    });

    it('should detect MX format without XML declaration', () => {
      const message = `<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>MSG000</MsgId>
    </GrpHdr>
  </FIToFICstmrCdtTrf>
</Document>`;
      const result = detectMessage(message);
      expect(result.format).toBe(MessageFormat.MX);
      expect(result.messageType).toBe(MessageType.PACS008);
      expect(result.confidence).toBe(1.0);
    });

    it('should detect MX format but unknown type for unsupported namespace', () => {
      const message = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>PAIN001</MsgId>
    </GrpHdr>
  </CstmrCdtTrfInitn>
</Document>`;
      const result = detectMessage(message);
      expect(result.format).toBe(MessageFormat.MX);
      expect(result.messageType).toBe(MessageType.UNKNOWN);
      expect(result.confidence).toBe(0.7);
    });
  });

  describe('Edge cases', () => {
    it('should return UNKNOWN for empty message', () => {
      const result = detectMessage('');
      expect(result.format).toBe(MessageFormat.UNKNOWN);
      expect(result.messageType).toBe(MessageType.UNKNOWN);
      expect(result.confidence).toBe(0);
    });

    it('should return UNKNOWN for whitespace-only message', () => {
      const result = detectMessage('   \n\t  ');
      expect(result.format).toBe(MessageFormat.UNKNOWN);
      expect(result.messageType).toBe(MessageType.UNKNOWN);
      expect(result.confidence).toBe(0);
    });

    it('should return UNKNOWN for invalid message format', () => {
      const result = detectMessage('This is not a valid message');
      expect(result.format).toBe(MessageFormat.UNKNOWN);
      expect(result.messageType).toBe(MessageType.UNKNOWN);
      expect(result.confidence).toBe(0);
    });

    it('should return UNKNOWN for partial MT message', () => {
      const result = detectMessage('{1:');
      expect(result.format).toBe(MessageFormat.MT);
      expect(result.messageType).toBe(MessageType.UNKNOWN);
      expect(result.confidence).toBe(0.7);
    });

    it('should detect MX format for partial XML message with unknown type', () => {
      const result = detectMessage('<?xml version="1.0"');
      expect(result.format).toBe(MessageFormat.MX);
      expect(result.messageType).toBe(MessageType.UNKNOWN);
      expect(result.confidence).toBe(0.7);
    });

    it('should handle messages with leading whitespace', () => {
      const message = `  \n  {1:F01BANKBICAXXX0000000000}{2:I103BANKBICAXXXXN}{4:
:20:REF
-}`;
      const result = detectMessage(message);
      expect(result.format).toBe(MessageFormat.MT);
      expect(result.messageType).toBe(MessageType.MT103);
    });

    it('should handle XML messages with leading whitespace', () => {
      const message = `  \n  <?xml version="1.0"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10">
</Document>`;
      const result = detectMessage(message);
      expect(result.format).toBe(MessageFormat.MX);
      expect(result.messageType).toBe(MessageType.PACS008);
    });
  });
});

describe('isMtFormat', () => {
  it('should return true for MT messages', () => {
    const message = `{1:F01BANKBICAXXX0000000000}{2:I103BANKBICAXXXXN}{4::20:REF-}`;
    expect(isMtFormat(message)).toBe(true);
  });

  it('should return false for MX messages', () => {
    const message = `<?xml version="1.0"?><Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10"></Document>`;
    expect(isMtFormat(message)).toBe(false);
  });

  it('should return false for unknown format', () => {
    expect(isMtFormat('invalid')).toBe(false);
  });
});

describe('isMxFormat', () => {
  it('should return true for MX messages', () => {
    const message = `<?xml version="1.0"?><Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10"></Document>`;
    expect(isMxFormat(message)).toBe(true);
  });

  it('should return false for MT messages', () => {
    const message = `{1:F01BANKBICAXXX0000000000}{2:I103BANKBICAXXXXN}{4::20:REF-}`;
    expect(isMxFormat(message)).toBe(false);
  });

  it('should return false for unknown format', () => {
    expect(isMxFormat('invalid')).toBe(false);
  });
});

describe('getMessageTypeName', () => {
  it('should return friendly names for all MT types', () => {
    expect(getMessageTypeName(MessageType.MT103)).toBe('MT103 - Customer Credit Transfer');
    expect(getMessageTypeName(MessageType.MT202)).toBe('MT202 - FI Credit Transfer');
    expect(getMessageTypeName(MessageType.MT940)).toBe('MT940 - Customer Statement');
    expect(getMessageTypeName(MessageType.MT942)).toBe('MT942 - Interim Transaction Report');
  });

  it('should return friendly names for all MX types', () => {
    expect(getMessageTypeName(MessageType.PACS008)).toBe('pacs.008 - Customer Credit Transfer');
    expect(getMessageTypeName(MessageType.PACS009)).toBe('pacs.009 - FI Credit Transfer');
    expect(getMessageTypeName(MessageType.CAMT053)).toBe('camt.053 - Bank-to-Customer Statement');
    expect(getMessageTypeName(MessageType.CAMT052)).toBe('camt.052 - Interim Report');
  });

  it('should return unknown for UNKNOWN type', () => {
    expect(getMessageTypeName(MessageType.UNKNOWN)).toBe('Unknown Message Type');
  });
});
