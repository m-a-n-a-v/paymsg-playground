import { describe, it, expect } from 'vitest';
import { formatMt, formatXml, formatJson } from './formatter';

describe('formatMt', () => {
  describe('MT103 formatting', () => {
    it('should format a basic MT103 message with proper block structure', () => {
      const input = '{1:F01BANKBICAXXX0000000000}{2:I103BANKBICAXXXXN}{4:\n:20:REF123\n:32A:260210EUR1234,56\n:50K:/12345678\nJohn Doe\n123 Main St\n:59:/87654321\nJane Smith\nAcme Corp\n-}';

      const result = formatMt(input);

      expect(result).toContain('{1:F01BANKBICAXXX0000000000}');
      expect(result).toContain('{2:I103BANKBICAXXXXN}');
      expect(result).toContain('{4:');
      expect(result).toContain('  :20:REF123');
      expect(result).toContain('  :32A:260210EUR1234,56');
      expect(result).toContain('  :50K:/12345678\nJohn Doe\n123 Main St');
      expect(result).toContain('-}');
    });

    it('should format MT103 with Block 3 (User Header)', () => {
      const input = '{1:F01BANKBICAXXX0000000000}{2:I103BANKBICAXXXXN}{3:{108:MUR}{121:550e8400-e29b-41d4-a716-446655440000}}{4:\n:20:REF123\n-}';

      const result = formatMt(input);

      expect(result).toContain('{3:\n  {108:MUR}\n  {121:550e8400-e29b-41d4-a716-446655440000}\n}');
    });

    it('should format MT103 with Block 5 (Trailer)', () => {
      const input = '{1:F01BANKBICAXXX0000000000}{2:I103BANKBICAXXXXN}{4:\n:20:REF123\n-}{5:{CHK:ABCD1234}{MAC:12345678}}';

      const result = formatMt(input);

      expect(result).toContain('{5:\n  {CHK:ABCD1234}\n  {MAC:12345678}\n}');
    });

    it('should handle multi-line field values correctly', () => {
      const input = '{4:\n:70:/INV/123456\nPayment for invoice\nDue date: 2026-02-15\n-}';

      const result = formatMt(input);

      expect(result).toContain('  :70:/INV/123456\nPayment for invoice\nDue date: 2026-02-15');
    });

    it('should format all 5 blocks together', () => {
      const input = '{1:F01BANKBICAXXX0000000000}{2:I103BANKBICAXXXXN}{3:{108:MUR}}{4:\n:20:REF123\n:32A:260210EUR1234,56\n-}{5:{CHK:ABCD1234}}';

      const result = formatMt(input);

      expect(result.split('\n').length).toBeGreaterThan(5);
      expect(result).toContain('{1:');
      expect(result).toContain('{2:');
      expect(result).toContain('{3:');
      expect(result).toContain('{4:');
      expect(result).toContain('{5:');
    });
  });

  describe('MT940 formatting', () => {
    it('should format MT940 statement with multiple field 61 entries', () => {
      const input = '{1:F01BANKBICAXXX0000000000}{2:I940BANKBICAXXXXN}{4:\n:20:STMT123\n:25:12345678\n:28C:123/1\n:60F:C260210EUR10000,00\n:61:260210C5000,00NTRFREF1\n:86:Transfer from Account A\n:61:260210D2000,00NCHKREF2\n:86:Check payment\n:62F:C260210EUR13000,00\n-}';

      const result = formatMt(input);

      expect(result).toContain('  :20:STMT123');
      expect(result).toContain('  :61:260210C5000,00NTRFREF1');
      expect(result).toContain('  :86:Transfer from Account A');
      expect(result).toContain('  :61:260210D2000,00NCHKREF2');
      expect(result).toContain('  :62F:C260210EUR13000,00');
    });
  });

  describe('MT202 formatting', () => {
    it('should format MT202 interbank transfer', () => {
      const input = '{1:F01BANKBICAXXX0000000000}{2:I202BANKBICAXXXXN}{4:\n:20:FT26021012345\n:21:RELATED123\n:32A:260210USD50000,00\n:52A:BANKBICAYYY\n:58A:BANKBICAZZZ\n-}';

      const result = formatMt(input);

      expect(result).toContain('  :20:FT26021012345');
      expect(result).toContain('  :32A:260210USD50000,00');
      expect(result).toContain('  :52A:BANKBICAYYY');
      expect(result).toContain('  :58A:BANKBICAZZZ');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      expect(formatMt('')).toBe('');
    });

    it('should handle whitespace-only string', () => {
      expect(formatMt('   ')).toBe('');
    });

    it('should handle message with CRLF line endings', () => {
      const input = '{1:F01BANKBICAXXX0000000000}\r\n{2:I103BANKBICAXXXXN}\r\n{4:\r\n:20:REF123\r\n-}';

      const result = formatMt(input);

      // Should normalize to LF
      expect(result).not.toContain('\r');
      expect(result).toContain('\n');
    });

    it('should preserve field content exactly', () => {
      const input = '{4:\n:70:Special chars: @#$%^&*()\n-}';

      const result = formatMt(input);

      expect(result).toContain('Special chars: @#$%^&*()');
    });

    it('should handle Block 4 without fields', () => {
      const input = '{4:\n-}';

      const result = formatMt(input);

      expect(result).toContain('{4:');
      expect(result).toContain('-}');
    });

    it('should handle malformed blocks gracefully', () => {
      const input = '{1:F01BANKBICAXXX0000000000}{INVALID}';

      const result = formatMt(input);

      // Should still format the valid block
      expect(result).toContain('{1:F01BANKBICAXXX0000000000}');
    });
  });

  describe('Indentation', () => {
    it('should indent Block 4 fields with 2 spaces', () => {
      const input = '{4:\n:20:REF123\n:32A:260210EUR1000,00\n-}';

      const result = formatMt(input);

      const lines = result.split('\n');
      const fieldLines = lines.filter(l => l.startsWith('  :'));
      expect(fieldLines.length).toBe(2);
      expect(fieldLines[0]).toBe('  :20:REF123');
      expect(fieldLines[1]).toBe('  :32A:260210EUR1000,00');
    });

    it('should indent Block 3 nested tags with 2 spaces', () => {
      const input = '{3:{108:MUR}{121:UUID}}';

      const result = formatMt(input);

      const lines = result.split('\n');
      expect(lines.some(l => l === '  {108:MUR}')).toBe(true);
      expect(lines.some(l => l === '  {121:UUID}')).toBe(true);
    });
  });
});

describe('formatXml', () => {
  describe('Basic XML formatting', () => {
    it('should format simple XML with proper indentation', () => {
      const input = '<?xml version="1.0"?><root><child>value</child></root>';

      const result = formatXml(input);

      expect(result).toContain('<?xml version="1.0"?>');
      expect(result).toContain('<root>');
      expect(result).toContain('  <child>');
      expect(result).toContain('    value');
      expect(result).toContain('  </child>');
      expect(result).toContain('</root>');
    });

    it('should handle self-closing tags', () => {
      const input = '<root><child1/><child2/></root>';

      const result = formatXml(input);

      expect(result).toContain('<root>');
      expect(result).toContain('  <child1/>');
      expect(result).toContain('  <child2/>');
      expect(result).toContain('</root>');
    });

    it('should preserve attributes on the same line', () => {
      const input = '<root><Amount Ccy="EUR">1234.56</Amount></root>';

      const result = formatXml(input);

      const lines = result.split('\n');
      expect(lines.some(l => l.includes('<Amount Ccy="EUR">'))).toBe(true);
    });

    it('should handle nested elements', () => {
      const input = '<root><level1><level2><level3>deep</level3></level2></level1></root>';

      const result = formatXml(input);

      expect(result).toContain('<root>');
      expect(result).toContain('  <level1>');
      expect(result).toContain('    <level2>');
      expect(result).toContain('      <level3>');
      expect(result).toContain('        deep');
    });
  });

  describe('ISO 20022 XML formatting', () => {
    it('should format pacs.008 message structure', () => {
      const input = '<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10"><FIToFICstmrCdtTrf><GrpHdr><MsgId>MSG123</MsgId><CreDtTm>2026-02-10T12:00:00</CreDtTm></GrpHdr></FIToFICstmrCdtTrf></Document>';

      const result = formatXml(input);

      expect(result).toContain('<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10">');
      expect(result).toContain('  <FIToFICstmrCdtTrf>');
      expect(result).toContain('    <GrpHdr>');
      expect(result).toContain('      <MsgId>');
      expect(result).toContain('        MSG123');
    });

    it('should format camt.053 statement structure', () => {
      const input = '<Document><BkToCstmrStmt><GrpHdr><MsgId>STMT123</MsgId></GrpHdr><Stmt><Bal><Amt Ccy="EUR">10000.00</Amt></Bal></Stmt></BkToCstmrStmt></Document>';

      const result = formatXml(input);

      expect(result).toContain('<Document>');
      expect(result).toContain('  <BkToCstmrStmt>');
      expect(result).toContain('    <GrpHdr>');
      expect(result).toContain('    <Stmt>');
      expect(result).toContain('      <Bal>');
      expect(result).toContain('        <Amt Ccy="EUR">');
    });
  });

  describe('Custom indentation', () => {
    it('should support 4-space indentation', () => {
      const input = '<root><child>value</child></root>';

      const result = formatXml(input, 4);

      const lines = result.split('\n');
      expect(lines[1]).toMatch(/^ {4}<child>/); // 4 spaces
    });

    it('should support tab indentation', () => {
      const input = '<root><child>value</child></root>';

      const result = formatXml(input, 1);

      const lines = result.split('\n');
      expect(lines[1]).toMatch(/^ <child>/); // 1 space
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      expect(formatXml('')).toBe('');
    });

    it('should handle whitespace-only string', () => {
      expect(formatXml('   ')).toBe('');
    });

    it('should handle XML with existing indentation', () => {
      const input = `<root>
  <child>
    value
  </child>
</root>`;

      const result = formatXml(input);

      // Should reformat with consistent indentation
      expect(result.split('\n').length).toBeGreaterThan(3);
    });

    it('should handle CRLF line endings', () => {
      const input = '<root>\r\n<child>value</child>\r\n</root>';

      const result = formatXml(input);

      // Should normalize to LF
      expect(result).not.toContain('\r');
    });

    it('should handle XML declaration', () => {
      const input = '<?xml version="1.0" encoding="UTF-8"?><root/>';

      const result = formatXml(input);

      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    });

    it('should handle comments', () => {
      const input = '<root><!-- comment --><child/></root>';

      const result = formatXml(input);

      expect(result).toContain('<!-- comment -->');
    });

    it('should handle mixed content', () => {
      const input = '<root>text<child/>more text</root>';

      const result = formatXml(input);

      // Should preserve content
      expect(result).toContain('text');
      expect(result).toContain('more text');
    });
  });
});

describe('formatJson', () => {
  describe('Basic JSON formatting', () => {
    it('should format simple object with 2-space indentation', () => {
      const obj = { name: 'John', age: 30 };

      const result = formatJson(obj);

      expect(result).toBe('{\n  "name": "John",\n  "age": 30\n}');
    });

    it('should format nested objects', () => {
      const obj = {
        person: {
          name: 'John',
          address: {
            street: '123 Main St',
            city: 'New York'
          }
        }
      };

      const result = formatJson(obj);

      expect(result).toContain('  "person": {');
      expect(result).toContain('    "name": "John"');
      expect(result).toContain('    "address": {');
      expect(result).toContain('      "street": "123 Main St"');
    });

    it('should format arrays', () => {
      const obj = { items: [1, 2, 3] };

      const result = formatJson(obj);

      expect(result).toContain('  "items": [');
      expect(result).toContain('    1,');
      expect(result).toContain('    2,');
      expect(result).toContain('    3');
    });

    it('should format array of objects', () => {
      const obj = {
        users: [
          { name: 'Alice', age: 25 },
          { name: 'Bob', age: 30 }
        ]
      };

      const result = formatJson(obj);

      expect(result).toContain('  "users": [');
      expect(result).toContain('      "name": "Alice"');
      expect(result).toContain('      "name": "Bob"');
    });
  });

  describe('Custom indentation', () => {
    it('should support 4-space indentation', () => {
      const obj = { name: 'John' };

      const result = formatJson(obj, 4);

      expect(result).toBe('{\n    "name": "John"\n}');
    });

    it('should support tab indentation (1 char)', () => {
      const obj = { name: 'John' };

      const result = formatJson(obj, 1);

      expect(result).toBe('{\n "name": "John"\n}');
    });
  });

  describe('Special values', () => {
    it('should handle null values', () => {
      const obj = { value: null };

      const result = formatJson(obj);

      expect(result).toContain('"value": null');
    });

    it('should handle boolean values', () => {
      const obj = { active: true, deleted: false };

      const result = formatJson(obj);

      expect(result).toContain('"active": true');
      expect(result).toContain('"deleted": false');
    });

    it('should handle empty object', () => {
      const result = formatJson({});

      expect(result).toBe('{}');
    });

    it('should handle empty array', () => {
      const result = formatJson([]);

      expect(result).toBe('[]');
    });

    it('should handle numbers', () => {
      const obj = { integer: 42, float: 3.14, negative: -100 };

      const result = formatJson(obj);

      expect(result).toContain('"integer": 42');
      expect(result).toContain('"float": 3.14');
      expect(result).toContain('"negative": -100');
    });

    it('should handle strings with special characters', () => {
      const obj = { text: 'Hello "World"\nNew line\tTab' };

      const result = formatJson(obj);

      expect(result).toContain('"text": "Hello \\"World\\"\\nNew line\\tTab"');
    });
  });

  describe('Message structure formatting', () => {
    it('should format parsed MT message structure', () => {
      const mtMessage = {
        format: 'MT',
        type: 'MT103',
        block1: {
          app_id: 'F',
          service_id: '01',
          lt_address: 'BANKBICAXXX',
          session: '0000',
          sequence: '000000'
        },
        block4: {
          fields: [
            { tag: '20', value: 'REF123' },
            { tag: '32A', value: '260210EUR1234,56' }
          ]
        }
      };

      const result = formatJson(mtMessage);

      expect(result).toContain('"format": "MT"');
      expect(result).toContain('"type": "MT103"');
      expect(result).toContain('"block1": {');
      expect(result).toContain('"app_id": "F"');
      expect(result).toContain('"fields": [');
      expect(result).toContain('"tag": "20"');
    });
  });
});
