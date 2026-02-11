import { describe, it, expect } from 'vitest';
import { sampleMessages } from './messages';
import { parseMessage } from '../engine/parser';
import { detectMessage } from '../engine/detector';
import { MessageFormat } from '../engine/types';

describe('Sample Messages', () => {
  it('should have 9 sample messages', () => {
    expect(sampleMessages).toHaveLength(9);
  });

  it('should have unique IDs for all samples', () => {
    const ids = sampleMessages.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(sampleMessages.length);
  });

  it('should have all required fields for each sample', () => {
    sampleMessages.forEach((sample) => {
      expect(sample.id).toBeTruthy();
      expect(sample.label).toBeTruthy();
      expect(sample.description).toBeTruthy();
      expect(sample.format).toBeTruthy();
      expect(sample.messageType).toBeTruthy();
      expect(sample.content).toBeTruthy();
    });
  });

  describe('MT Sample Parsing', () => {
    const mtSamples = sampleMessages.filter((s) => s.format === MessageFormat.MT);

    it('should have 5 MT samples', () => {
      expect(mtSamples).toHaveLength(5);
    });

    it('should parse all MT samples without errors', () => {
      mtSamples.forEach((sample) => {
        expect(() => parseMessage(sample.content)).not.toThrow();
        const parsed = parseMessage(sample.content);
        expect(parsed).toBeTruthy();
      });
    });

    it('should detect MT format for all MT samples', () => {
      mtSamples.forEach((sample) => {
        const detected = detectMessage(sample.content);
        expect(detected.format).toBe(MessageFormat.MT);
        expect(detected.messageType).toBe(sample.messageType);
      });
    });

    it('should parse MT103 SEPA sample correctly', () => {
      const sample = mtSamples.find((s) => s.id === 'mt103-sepa-eur');
      expect(sample).toBeTruthy();
      if (!sample) return;

      const parsed = parseMessage(sample.content);
      expect(parsed).toBeTruthy();

      if ('block1' in parsed && parsed.block4) {
        expect(parsed.block1).toBeTruthy();
        expect(parsed.block2).toBeTruthy();
        expect(parsed.block4).toBeTruthy();
        expect(parsed.block4.fields.length).toBeGreaterThan(0);

        // Check for key fields
        const field20 = parsed.block4.fields.find((f) => f.tag === '20');
        expect(field20?.value).toBe('SEPA20260210001');

        const field32A = parsed.block4.fields.find((f) => f.tag === '32A');
        expect(field32A?.subfields?.['currency']).toBe('EUR');
        expect(field32A?.subfields?.['amount']).toBe('2500,00');
      }
    });

    it('should parse MT940 daily statement sample correctly', () => {
      const sample = mtSamples.find((s) => s.id === 'mt940-daily-statement');
      expect(sample).toBeTruthy();
      if (!sample) return;

      const parsed = parseMessage(sample.content);
      expect(parsed).toBeTruthy();

      if ('block1' in parsed && parsed.block4) {
        expect(parsed.block4).toBeTruthy();

        // MT940 should have multiple field 61 (statement lines)
        const field61s = parsed.block4.fields.filter((f) => f.tag === '61');
        expect(field61s.length).toBeGreaterThan(3);

        // Check opening balance
        const field60F = parsed.block4.fields.find((f) => f.tag === '60F');
        expect(field60F?.subfields?.['debit_credit']).toBe('C');
        expect(field60F?.subfields?.['currency']).toBe('EUR');

        // Check closing balance
        const field62F = parsed.block4.fields.find((f) => f.tag === '62F');
        expect(field62F?.subfields?.['debit_credit']).toBe('C');
        expect(field62F?.subfields?.['currency']).toBe('EUR');
      }
    });
  });

  describe('MX Sample Parsing', () => {
    const mxSamples = sampleMessages.filter((s) => s.format === MessageFormat.MX);

    it('should have 4 MX samples', () => {
      expect(mxSamples).toHaveLength(4);
    });

    it('should parse all MX samples without errors', () => {
      mxSamples.forEach((sample) => {
        expect(() => parseMessage(sample.content)).not.toThrow();
        const parsed = parseMessage(sample.content);
        expect(parsed).toBeTruthy();
      });
    });

    it('should detect MX format for all MX samples', () => {
      mxSamples.forEach((sample) => {
        const detected = detectMessage(sample.content);
        expect(detected.format).toBe(MessageFormat.MX);
        expect(detected.messageType).toBe(sample.messageType);
      });
    });

    it('should parse pacs.008 SEPA sample correctly', () => {
      const sample = mxSamples.find((s) => s.id === 'pacs008-sepa');
      expect(sample).toBeTruthy();
      if (!sample) return;

      const parsed = parseMessage(sample.content);
      expect(parsed).toBeTruthy();

      if ('document' in parsed) {
        expect(parsed.namespace).toContain('pacs.008.001.10');
        expect(parsed.root).toBeTruthy();

        // Verify we can access key elements (using the helper in parser.ts)
        const docElement = parsed.root.firstElementChild;
        expect(docElement?.localName).toMatch(/FIToFICstmrCdtTrf|Document/);
      }
    });

    it('should parse camt.053 daily statement sample correctly', () => {
      const sample = mxSamples.find((s) => s.id === 'camt053-daily-statement');
      expect(sample).toBeTruthy();
      if (!sample) return;

      const parsed = parseMessage(sample.content);
      expect(parsed).toBeTruthy();

      if ('document' in parsed) {
        expect(parsed.namespace).toContain('camt.053.001.10');
        expect(parsed.root).toBeTruthy();

        // Check for statement structure
        const docElement = parsed.root.firstElementChild;
        expect(docElement?.localName).toMatch(/BkToCstmrStmt|Document/);
      }
    });
  });

  describe('Message Type Coverage', () => {
    it('should have MT103 samples', () => {
      const mt103Samples = sampleMessages.filter((s) => s.id.includes('mt103'));
      expect(mt103Samples.length).toBeGreaterThanOrEqual(2);
    });

    it('should have MT202 sample', () => {
      const mt202Sample = sampleMessages.find((s) => s.id.includes('mt202'));
      expect(mt202Sample).toBeTruthy();
    });

    it('should have MT940 sample', () => {
      const mt940Sample = sampleMessages.find((s) => s.id.includes('mt940'));
      expect(mt940Sample).toBeTruthy();
    });

    it('should have MT942 sample', () => {
      const mt942Sample = sampleMessages.find((s) => s.id.includes('mt942'));
      expect(mt942Sample).toBeTruthy();
    });

    it('should have pacs.008 sample', () => {
      const pacs008Sample = sampleMessages.find((s) => s.id.includes('pacs008'));
      expect(pacs008Sample).toBeTruthy();
    });

    it('should have pacs.009 sample', () => {
      const pacs009Sample = sampleMessages.find((s) => s.id.includes('pacs009'));
      expect(pacs009Sample).toBeTruthy();
    });

    it('should have camt.053 sample', () => {
      const camt053Sample = sampleMessages.find((s) => s.id.includes('camt053'));
      expect(camt053Sample).toBeTruthy();
    });

    it('should have camt.052 sample', () => {
      const camt052Sample = sampleMessages.find((s) => s.id.includes('camt052'));
      expect(camt052Sample).toBeTruthy();
    });
  });

  describe('Message Content Quality', () => {
    it('should have realistic amounts in messages', () => {
      sampleMessages.forEach((sample) => {
        // MT messages use comma decimal separator
        if (sample.format === MessageFormat.MT) {
          expect(sample.content).toMatch(/\d+,\d{2}/);
        }
        // MX messages use period decimal separator
        if (sample.format === MessageFormat.MX) {
          expect(sample.content).toMatch(/\d+\.\d{2}/);
        }
      });
    });

    it('should have IBANs in appropriate messages', () => {
      const ibanSamples = sampleMessages.filter((s) =>
        s.content.includes('IBAN') || s.content.match(/[A-Z]{2}\d{2}[A-Z0-9]+/)
      );
      expect(ibanSamples.length).toBeGreaterThan(5);
    });

    it('should have BICs in appropriate messages', () => {
      const bicSamples = sampleMessages.filter((s) =>
        s.content.match(/[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?/)
      );
      expect(bicSamples.length).toBeGreaterThan(5);
    });

    it('should have currency codes in all messages', () => {
      sampleMessages.forEach((sample) => {
        expect(sample.content).toMatch(/EUR|USD|GBP/);
      });
    });

    it('should have message descriptions that are descriptive', () => {
      sampleMessages.forEach((sample) => {
        expect(sample.description.length).toBeGreaterThan(20);
        expect(sample.description).not.toBe(sample.label);
      });
    });
  });
});
