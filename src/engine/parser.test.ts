/**
 * Tests for MT message parser
 */

import { describe, it, expect } from 'vitest';
import { parseMtMessage, parseMessage } from './parser';

describe('parseMtMessage', () => {
  describe('MT103 parsing', () => {
    const mt103Full = `{1:F01DEUTDEFFAXXX0000000000}{2:I103BNPAFRPPXXXXN}{3:{108:TESTMUR123456}{121:a1b2c3d4-e5f6-7890-abcd-ef1234567890}}{4:
:20:FULLREF98765
:13C:/SNDTIME/1615+0100
:23B:CRED
:23E:CHQB/URGP
:26T:/ORDER/ORD123456
:32A:260215EUR10000,00
:33B:USD11500,00
:36:1,15
:50K:/DE89370400440532013000
MUELLER INTERNATIONAL GMBH
HAUPTSTRASSE 123
60313 FRANKFURT AM MAIN
GERMANY
:51A:COBADEFFXXX
:52A:/12345678
DEUTDEFFXXX
:56A:CHASUS33XXX
:57A:/987654321
BNPAFRPPXXX
:59:/FR1420041010050500013M02606
DUPONT TRADING SARL
1 RUE DE LA PAIX
75001 PARIS
FRANCE
:70:/INV/2026-02-001
INVOICE 2026-02-001 DATED 2026-02-01
CONSULTING SERVICES JANUARY 2026
:71A:SHA
:71F:EUR10,00
:71G:EUR5,00
:72:/ACC/BENEFICIARY ACCOUNT INFO
/INS/URGENT PAYMENT
:77B:/ORDERRES/BE//MEILAAN 1, 1000 BRUSSELS
-}{5:{CHK:123456789ABC}}`;

    it('should parse Block 1 correctly', () => {
      const result = parseMtMessage(mt103Full);
      expect(result.block1).toBeDefined();
      expect(result.block1?.app_id).toBe('F');
      expect(result.block1?.service_id).toBe('01');
      expect(result.block1?.lt_address).toBe('DEUTDEFFAXXX');
      expect(result.block1?.session_number).toBe('0000');
      expect(result.block1?.sequence_number).toBe('000000');
    });

    it('should parse Block 2 Input format correctly', () => {
      const result = parseMtMessage(mt103Full);
      expect(result.block2).toBeDefined();
      expect(result.block2?.direction).toBe('I');
      expect(result.block2?.message_type).toBe('103');
      expect(result.block2?.destination_address).toBe('BNPAFRPPXXXX');
      expect(result.block2?.priority).toBe('N');
    });

    it('should parse Block 3 user header correctly', () => {
      const result = parseMtMessage(mt103Full);
      expect(result.block3).toBeDefined();
      expect(result.block3?.tags['108']).toBe('TESTMUR123456');
      expect(result.block3?.tags['121']).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    });

    it('should parse Block 4 fields correctly', () => {
      const result = parseMtMessage(mt103Full);
      expect(result.block4).toBeDefined();
      expect(result.block4?.fields).toBeDefined();
      expect(result.block4?.fields.length).toBeGreaterThan(0);

      // Check field 20 (Transaction Reference)
      const field20 = result.block4?.fields.find((f) => f.tag === '20');
      expect(field20).toBeDefined();
      expect(field20?.value).toBe('FULLREF98765');

      // Check field 23B
      const field23B = result.block4?.fields.find((f) => f.tag === '23B');
      expect(field23B).toBeDefined();
      expect(field23B?.value).toBe('CRED');

      // Check field 71A (Charge Bearer)
      const field71A = result.block4?.fields.find((f) => f.tag === '71A');
      expect(field71A).toBeDefined();
      expect(field71A?.value).toBe('SHA');
    });

    it('should parse field 32A subfields (Date, Currency, Amount)', () => {
      const result = parseMtMessage(mt103Full);
      const field32A = result.block4?.fields.find((f) => f.tag === '32A');
      expect(field32A).toBeDefined();
      expect(field32A?.value).toBe('260215EUR10000,00');
      expect(field32A?.subfields).toBeDefined();
      expect(field32A?.subfields?.['date']).toBe('260215');
      expect(field32A?.subfields?.['currency']).toBe('EUR');
      expect(field32A?.subfields?.['amount']).toBe('10000,00');
    });

    it('should parse field 33B subfields (Currency, Amount)', () => {
      const result = parseMtMessage(mt103Full);
      const field33B = result.block4?.fields.find((f) => f.tag === '33B');
      expect(field33B).toBeDefined();
      expect(field33B?.subfields).toBeDefined();
      expect(field33B?.subfields?.["currency"]).toBe('USD');
      expect(field33B?.subfields?.["amount"]).toBe('11500,00');
    });

    it('should parse field 50K subfields (Account + Name/Address)', () => {
      const result = parseMtMessage(mt103Full);
      const field50K = result.block4?.fields.find((f) => f.tag === '50K');
      expect(field50K).toBeDefined();
      expect(field50K?.subfields).toBeDefined();
      expect(field50K?.subfields?.["account"]).toBe('/DE89370400440532013000');
      expect(field50K?.subfields?.["name_address"]).toContain('MUELLER INTERNATIONAL GMBH');
      expect(field50K?.subfields?.["name_address"]).toContain('FRANKFURT AM MAIN');
    });

    it('should parse field 52A subfields (Account + BIC)', () => {
      const result = parseMtMessage(mt103Full);
      const field52A = result.block4?.fields.find((f) => f.tag === '52A');
      expect(field52A).toBeDefined();
      expect(field52A?.subfields).toBeDefined();
      expect(field52A?.subfields?.["account"]).toBe('/12345678');
      expect(field52A?.subfields?.["bic"]).toBe('DEUTDEFFXXX');
    });

    it('should parse field 57A subfields (Account + BIC)', () => {
      const result = parseMtMessage(mt103Full);
      const field57A = result.block4?.fields.find((f) => f.tag === '57A');
      expect(field57A).toBeDefined();
      expect(field57A?.subfields).toBeDefined();
      expect(field57A?.subfields?.["account"]).toBe('/987654321');
      expect(field57A?.subfields?.["bic"]).toBe('BNPAFRPPXXX');
    });

    it('should parse field 59 subfields (Account + Name/Address)', () => {
      const result = parseMtMessage(mt103Full);
      const field59 = result.block4?.fields.find((f) => f.tag === '59');
      expect(field59).toBeDefined();
      expect(field59?.subfields).toBeDefined();
      expect(field59?.subfields?.["account"]).toBe('/FR1420041010050500013M02606');
      expect(field59?.subfields?.["name_address"]).toContain('DUPONT TRADING SARL');
      expect(field59?.subfields?.["name_address"]).toContain('PARIS');
    });

    it('should parse multi-line field values correctly', () => {
      const result = parseMtMessage(mt103Full);
      const field70 = result.block4?.fields.find((f) => f.tag === '70');
      expect(field70).toBeDefined();
      expect(field70?.value).toContain('/INV/2026-02-001');
      expect(field70?.value).toContain('INVOICE 2026-02-001 DATED 2026-02-01');
      expect(field70?.value).toContain('CONSULTING SERVICES JANUARY 2026');
    });

    it('should parse Block 5 trailer correctly', () => {
      const result = parseMtMessage(mt103Full);
      expect(result.block5).toBeDefined();
      expect(result.block5?.tags['CHK']).toBe('123456789ABC');
    });
  });

  describe('MT202 parsing', () => {
    const mt202Full = `{1:F01DEUTDEFFAXXX0000000000}{2:I202BNPAFRPPXXXXN}{3:{108:FI202FULL001}{121:f47ac10b-58cc-4372-a567-0e02b2c3d479}}{4:
:20:FI20231115002
:21:MT103REF789012
:13C:/SNDTIME/1430+0100
:32A:231115USD125000,00
:52A:DEUTDEFF
:53A:COBADEFF
:56A:CHASUS33
:57A:BOFAUS3N
:58A:/1234567890
BNPAFRPP
:72:/INS/CHASUS33
/ACC/VOSTRO12345
/BNF/Final beneficiary FI details
-}{5:{CHK:123456789ABC}}`;

    it('should parse MT202 Block 1', () => {
      const result = parseMtMessage(mt202Full);
      expect(result.block1).toBeDefined();
      expect(result.block1?.app_id).toBe('F');
      expect(result.block1?.service_id).toBe('01');
      expect(result.block1?.lt_address).toBe('DEUTDEFFAXXX');
    });

    it('should parse MT202 Block 2', () => {
      const result = parseMtMessage(mt202Full);
      expect(result.block2).toBeDefined();
      expect(result.block2?.direction).toBe('I');
      expect(result.block2?.message_type).toBe('202');
      expect(result.block2?.destination_address).toBe('BNPAFRPPXXXX');
    });

    it('should parse MT202 fields', () => {
      const result = parseMtMessage(mt202Full);
      expect(result.block4).toBeDefined();

      const field20 = result.block4?.fields.find((f) => f.tag === '20');
      expect(field20?.value).toBe('FI20231115002');

      const field21 = result.block4?.fields.find((f) => f.tag === '21');
      expect(field21?.value).toBe('MT103REF789012');

      const field32A = result.block4?.fields.find((f) => f.tag === '32A');
      expect(field32A?.subfields?.["date"]).toBe('231115');
      expect(field32A?.subfields?.["currency"]).toBe('USD');
      expect(field32A?.subfields?.["amount"]).toBe('125000,00');
    });

    it('should parse MT202 field 58A with account and BIC', () => {
      const result = parseMtMessage(mt202Full);
      const field58A = result.block4?.fields.find((f) => f.tag === '58A');
      expect(field58A).toBeDefined();
      expect(field58A?.subfields?.["account"]).toBe('/1234567890');
      expect(field58A?.subfields?.["bic"]).toBe('BNPAFRPP');
    });
  });

  describe('MT940 parsing', () => {
    const mt940Multi = `{1:F01BNPAFRPPAXXX0000000000}{2:I940CORPORATEXXXN}{4:
:20:STMT20231115002
:25:FR7630006000011234567890189
:28C:127/1
:60F:C231114EUR50000,00
:61:2311150C15000,00NTRF020231115001//BANK REF 001
:86:?20Payment from Customer A
?32ACME CORPORATION
?60DE89370400440532013000
:61:2311150C5000,00NSTD021115STDO001//BANK REF 002
:86:?20Standing Order - Monthly Rent
?32PROPERTY MANAGEMENT LTD
:61:2311150D2500,00NCHK022115CHK123//BANK REF 003
Presented cheque
:86:?20Cheque Payment
?32Office Supplies Inc
?60GB29NWBK60161331926819
:61:2311150C25000,00NMSC023115MSC001//BANK REF 004
:86:?20Miscellaneous Credit
?32International Client XYZ
?60US1234567890
:61:231115D8000,00NDDT024115DEB001//BANK REF 005
:86:?20Direct Debit - Utilities
?32Power Company Ltd
:61:2311150C12500,00NTRF025115INT002//BANK REF 006
:86:?20Incoming Wire Transfer
?32Business Partner Corp
?60IT60X0542811101000000123456
:62F:C231115EUR97000,00
:64:C231115EUR95000,00
-}`;

    it('should parse MT940 Block 1', () => {
      const result = parseMtMessage(mt940Multi);
      expect(result.block1).toBeDefined();
      expect(result.block1?.app_id).toBe('F');
      expect(result.block1?.lt_address).toBe('BNPAFRPPAXXX');
    });

    it('should parse MT940 Block 2', () => {
      const result = parseMtMessage(mt940Multi);
      expect(result.block2).toBeDefined();
      expect(result.block2?.message_type).toBe('940');
    });

    it('should parse MT940 statement fields', () => {
      const result = parseMtMessage(mt940Multi);

      const field20 = result.block4?.fields.find((f) => f.tag === '20');
      expect(field20?.value).toBe('STMT20231115002');

      const field25 = result.block4?.fields.find((f) => f.tag === '25');
      expect(field25?.value).toBe('FR7630006000011234567890189');

      const field28C = result.block4?.fields.find((f) => f.tag === '28C');
      expect(field28C?.value).toBe('127/1');
    });

    it('should parse field 60F subfields (Opening Balance)', () => {
      const result = parseMtMessage(mt940Multi);
      const field60F = result.block4?.fields.find((f) => f.tag === '60F');
      expect(field60F).toBeDefined();
      expect(field60F?.subfields?.["debit_credit"]).toBe('C');
      expect(field60F?.subfields?.["date"]).toBe('231114');
      expect(field60F?.subfields?.["currency"]).toBe('EUR');
      expect(field60F?.subfields?.["amount"]).toBe('50000,00');
    });

    it('should parse field 62F subfields (Closing Balance)', () => {
      const result = parseMtMessage(mt940Multi);
      const field62F = result.block4?.fields.find((f) => f.tag === '62F');
      expect(field62F).toBeDefined();
      expect(field62F?.subfields?.["debit_credit"]).toBe('C');
      expect(field62F?.subfields?.["date"]).toBe('231115');
      expect(field62F?.subfields?.["currency"]).toBe('EUR');
      expect(field62F?.subfields?.["amount"]).toBe('97000,00');
    });

    it('should parse field 64 subfields (Available Balance)', () => {
      const result = parseMtMessage(mt940Multi);
      const field64 = result.block4?.fields.find((f) => f.tag === '64');
      expect(field64).toBeDefined();
      expect(field64?.subfields?.["debit_credit"]).toBe('C');
      expect(field64?.subfields?.["date"]).toBe('231115');
      expect(field64?.subfields?.["currency"]).toBe('EUR');
      expect(field64?.subfields?.["amount"]).toBe('95000,00');
    });

    it('should parse multiple field 61 statement lines', () => {
      const result = parseMtMessage(mt940Multi);
      const field61s = result.block4?.fields.filter((f) => f.tag === '61');
      expect(field61s).toBeDefined();
      expect(field61s?.length).toBe(6);
    });

    it('should parse field 61 subfields (Statement Line) - credit entry', () => {
      const result = parseMtMessage(mt940Multi);
      const field61s = result.block4?.fields.filter((f) => f.tag === '61');
      const firstEntry = field61s?.[0];

      expect(firstEntry).toBeDefined();
      expect(firstEntry?.subfields?.["value_date"]).toBe('231115');
      expect(firstEntry?.subfields?.["debit_credit"]).toBe('C');
      expect(firstEntry?.subfields?.["amount"]).toBe('15000,00');
      expect(firstEntry?.subfields?.["type_code"]).toBe('NTRF');
      expect(firstEntry?.subfields?.["reference"]).toBe('020231115001');
      expect(firstEntry?.subfields?.["supplementary"]).toBe('BANK REF 001');
    });

    it('should parse field 61 subfields - debit entry', () => {
      const result = parseMtMessage(mt940Multi);
      const field61s = result.block4?.fields.filter((f) => f.tag === '61');
      const debitEntry = field61s?.[2]; // Third entry is a debit

      expect(debitEntry).toBeDefined();
      expect(debitEntry?.subfields?.["value_date"]).toBe('231115');
      expect(debitEntry?.subfields?.["debit_credit"]).toBe('D');
      expect(debitEntry?.subfields?.["amount"]).toBe('2500,00');
      expect(debitEntry?.subfields?.["type_code"]).toBe('NCHK');
      expect(debitEntry?.subfields?.["reference"]).toBe('022115CHK123');
      expect(debitEntry?.subfields?.["supplementary"]).toBe('BANK REF 003');
      expect(debitEntry?.subfields?.["additional_info"]).toBe('Presented cheque');
    });

    it('should parse field 86 information lines', () => {
      const result = parseMtMessage(mt940Multi);
      const field86s = result.block4?.fields.filter((f) => f.tag === '86');
      expect(field86s).toBeDefined();
      expect(field86s?.length).toBe(6);

      const firstInfo = field86s?.[0];
      expect(firstInfo?.value).toContain('?20Payment from Customer A');
      expect(firstInfo?.value).toContain('?32ACME CORPORATION');
      expect(firstInfo?.value).toContain('?60DE89370400440532013000');
    });
  });

  describe('MT942 parsing', () => {
    const mt942Minimal = `{1:F01DEUTDEFFAXXX0000000000}{2:I942CORPORATEXXXN}{4:
:20:INTR20231115001
:25:DE89370400440532013000
:28C:1/1
-}`;

    it('should parse minimal MT942', () => {
      const result = parseMtMessage(mt942Minimal);
      expect(result.block1).toBeDefined();
      expect(result.block2).toBeDefined();
      expect(result.block2?.message_type).toBe('942');
      expect(result.block4).toBeDefined();
    });

    it('should parse MT942 fields', () => {
      const result = parseMtMessage(mt942Minimal);
      expect(result.block4?.fields).toBeDefined();

      const field20 = result.block4?.fields.find((f) => f.tag === '20');
      expect(field20?.value).toBe('INTR20231115001');

      const field25 = result.block4?.fields.find((f) => f.tag === '25');
      expect(field25?.value).toBe('DE89370400440532013000');

      const field28C = result.block4?.fields.find((f) => f.tag === '28C');
      expect(field28C?.value).toBe('1/1');
    });
  });

  describe('Edge cases', () => {
    it('should handle messages without Block 3', () => {
      const mt = `{1:F01DEUTDEFFAXXX0000000000}{2:I103BNPAFRPPXXXXN}{4:
:20:REF123
:32A:260215EUR100,00
-}`;
      const result = parseMtMessage(mt);
      expect(result.block1).toBeDefined();
      expect(result.block2).toBeDefined();
      expect(result.block3).toBeUndefined();
      expect(result.block4).toBeDefined();
    });

    it('should handle messages without Block 5', () => {
      const mt = `{1:F01DEUTDEFFAXXX0000000000}{2:I103BNPAFRPPXXXXN}{4:
:20:REF123
:32A:260215EUR100,00
-}`;
      const result = parseMtMessage(mt);
      expect(result.block5).toBeUndefined();
    });

    it('should handle \\r\\n line endings', () => {
      const mt = `{1:F01DEUTDEFFAXXX0000000000}{2:I103BNPAFRPPXXXXN}{4:\r\n:20:REF123\r\n:32A:260215EUR100,00\r\n-}`;
      const result = parseMtMessage(mt);
      expect(result.block4).toBeDefined();
      const field20 = result.block4?.fields.find((f) => f.tag === '20');
      expect(field20?.value).toBe('REF123');
    });

    it('should handle Output (O) message format in Block 2', () => {
      const mt = `{1:F01DEUTDEFFAXXX0000000000}{2:O1030830231115BNPAFRPPXXXXN2}{4:
:20:REF123
-}`;
      const result = parseMtMessage(mt);
      expect(result.block2?.direction).toBe('O');
      expect(result.block2?.message_type).toBe('103');
    });

    it('should handle field without account prefix', () => {
      const mt = `{1:F01DEUTDEFFAXXX0000000000}{2:I103BNPAFRPPXXXXN}{4:
:20:REF123
:59:JOHN DOE
123 MAIN ST
-}`;
      const result = parseMtMessage(mt);
      const field59 = result.block4?.fields.find((f) => f.tag === '59');
      expect(field59?.subfields?.["name_address"]).toContain('JOHN DOE');
      expect(field59?.subfields?.["account"]).toBeUndefined();
    });
  });
});

describe('parseMessage', () => {
  it('should auto-detect and parse MT message', () => {
    const mt = `{1:F01DEUTDEFFAXXX0000000000}{2:I103BNPAFRPPXXXXN}{4:
:20:REF123
-}`;
    const result = parseMessage(mt);
    expect(result).toBeDefined();
    expect('block1' in result).toBe(true);
  });

  it('should throw error for MX message (not yet implemented)', () => {
    const mx = `<?xml version="1.0"?><Document></Document>`;
    expect(() => parseMessage(mx)).toThrow('MX parsing not yet implemented');
  });

  it('should throw error for unknown format', () => {
    const unknown = 'This is not a valid message';
    expect(() => parseMessage(unknown)).toThrow('Unable to detect message format');
  });
});
