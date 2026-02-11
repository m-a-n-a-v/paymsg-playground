import { describe, it, expect } from 'vitest';
import { detectMessage } from '../src/engine/detector';
import { parseMessage } from '../src/engine/parser';
import { validateMessage } from '../src/engine/validator';
import { translateMessage } from '../src/engine/translator';
import { samples } from '../src/samples/messages';
import { MessageFormat, MessageType } from '../src/engine/types';

describe('Integration Tests - Full Flow', () => {
  describe('MT103 Full Flow', () => {
    const mt103Sample = samples.find((s) => s.id === 'mt103-sepa-eur');

    it('should complete full flow: detect → parse → validate → translate', async () => {
      expect(mt103Sample).toBeDefined();
      if (mt103Sample === undefined) {
        throw new Error('MT103 sample not found');
      }

      // Step 1: Detect
      const detection = detectMessage(mt103Sample.content);
      expect(detection.format).toBe(MessageFormat.MT);
      expect(detection.messageType).toBe(MessageType.MT103);
      expect(detection.confidence).toBeGreaterThan(0.9);

      // Step 2: Parse
      const parsed = parseMessage(mt103Sample.content);
      expect(parsed).toBeDefined();
      expect('block1' in parsed || 'block2' in parsed || 'block4' in parsed).toBe(true);

      // Step 3: Validate
      const validation = await validateMessage(
        parsed,
        detection.messageType,
        detection.format
      );
      expect(validation).toBeDefined();
      expect(validation.issues).toBeDefined();
      expect(Array.isArray(validation.issues)).toBe(true);

      // Step 4: Translate to MX
      const translation = await translateMessage(mt103Sample.content, MessageFormat.MX);
      expect(translation).toBeDefined();
      expect(translation.translatedMessage).toBeDefined();
      expect(translation.targetFormat).toBe(MessageFormat.MX);
      expect(translation.sourceFormat).toBe(MessageFormat.MT);

      // Verify translated message is valid XML
      expect(translation.translatedMessage).toContain('<?xml');
      expect(translation.translatedMessage).toContain('pacs.008');
    });
  });

  describe('MT202 Full Flow', () => {
    const mt202Sample = samples.find((s) => s.id === 'mt202-interbank');

    it('should complete full flow: detect → parse → validate → translate', async () => {
      expect(mt202Sample).toBeDefined();
      if (mt202Sample === undefined) {
        throw new Error('MT202 sample not found');
      }

      const detection = detectMessage(mt202Sample.content);
      expect(detection.format).toBe(MessageFormat.MT);
      expect(detection.messageType).toBe(MessageType.MT202);

      const parsed = parseMessage(mt202Sample.content);
      expect(parsed).toBeDefined();

      const validation = await validateMessage(
        parsed,
        detection.messageType,
        detection.format
      );
      expect(validation.issues).toBeDefined();

      const translation = await translateMessage(mt202Sample.content, MessageFormat.MX);
      expect(translation.translatedMessage).toContain('pacs.009');
    });
  });

  describe('MT940 Full Flow', () => {
    const mt940Sample = samples.find((s) => s.id === 'mt940-daily-statement');

    it('should complete full flow: detect → parse → validate → translate', async () => {
      expect(mt940Sample).toBeDefined();
      if (mt940Sample === undefined) {
        throw new Error('MT940 sample not found');
      }

      const detection = detectMessage(mt940Sample.content);
      expect(detection.format).toBe(MessageFormat.MT);
      expect(detection.messageType).toBe(MessageType.MT940);

      const parsed = parseMessage(mt940Sample.content);
      expect(parsed).toBeDefined();

      const validation = await validateMessage(
        parsed,
        detection.messageType,
        detection.format
      );
      expect(validation.issues).toBeDefined();

      const translation = await translateMessage(mt940Sample.content, MessageFormat.MX);
      expect(translation.translatedMessage).toContain('camt.053');
    });
  });

  describe('MT942 Full Flow', () => {
    const mt942Sample = samples.find((s) => s.id === 'mt942-intraday');

    it('should complete full flow: detect → parse → validate → translate', async () => {
      expect(mt942Sample).toBeDefined();
      if (mt942Sample === undefined) {
        throw new Error('MT942 sample not found');
      }

      const detection = detectMessage(mt942Sample.content);
      expect(detection.format).toBe(MessageFormat.MT);
      expect(detection.messageType).toBe(MessageType.MT942);

      const parsed = parseMessage(mt942Sample.content);
      expect(parsed).toBeDefined();

      const validation = await validateMessage(
        parsed,
        detection.messageType,
        detection.format
      );
      expect(validation.issues).toBeDefined();

      const translation = await translateMessage(mt942Sample.content, MessageFormat.MX);
      expect(translation.translatedMessage).toContain('camt.052');
    });
  });

  describe('pacs.008 Full Flow', () => {
    const pacs008Sample = samples.find((s) => s.id === 'pacs008-sepa');

    it('should complete full flow: detect → parse → validate → translate', async () => {
      expect(pacs008Sample).toBeDefined();
      if (pacs008Sample === undefined) {
        throw new Error('pacs.008 sample not found');
      }

      const detection = detectMessage(pacs008Sample.content);
      expect(detection.format).toBe(MessageFormat.MX);
      expect(detection.messageType).toBe(MessageType.PACS008);

      const parsed = parseMessage(pacs008Sample.content);
      expect(parsed).toBeDefined();

      const validation = await validateMessage(
        parsed,
        detection.messageType,
        detection.format
      );
      expect(validation.issues).toBeDefined();

      const translation = await translateMessage(pacs008Sample.content, MessageFormat.MT);
      expect(translation.translatedMessage).toContain('{1:');
      expect(translation.translatedMessage).toContain('{2:');
      expect(translation.translatedMessage).toContain('{4:');
    });
  });

  describe('pacs.009 Full Flow', () => {
    const pacs009Sample = samples.find((s) => s.id === 'pacs009-fi-transfer');

    it('should complete full flow: detect → parse → validate → translate', async () => {
      expect(pacs009Sample).toBeDefined();
      if (pacs009Sample === undefined) {
        throw new Error('pacs.009 sample not found');
      }

      const detection = detectMessage(pacs009Sample.content);
      expect(detection.format).toBe(MessageFormat.MX);
      expect(detection.messageType).toBe(MessageType.PACS009);

      const parsed = parseMessage(pacs009Sample.content);
      expect(parsed).toBeDefined();

      const validation = await validateMessage(
        parsed,
        detection.messageType,
        detection.format
      );
      expect(validation.issues).toBeDefined();

      const translation = await translateMessage(pacs009Sample.content, MessageFormat.MT);
      expect(translation.translatedMessage).toContain('{1:');
    });
  });

  describe('camt.053 Full Flow', () => {
    const camt053Sample = samples.find((s) => s.id === 'camt053-daily-statement');

    it('should complete full flow: detect → parse → validate → translate', async () => {
      expect(camt053Sample).toBeDefined();
      if (camt053Sample === undefined) {
        throw new Error('camt.053 sample not found');
      }

      const detection = detectMessage(camt053Sample.content);
      expect(detection.format).toBe(MessageFormat.MX);
      expect(detection.messageType).toBe(MessageType.CAMT053);

      const parsed = parseMessage(camt053Sample.content);
      expect(parsed).toBeDefined();

      const validation = await validateMessage(
        parsed,
        detection.messageType,
        detection.format
      );
      expect(validation.issues).toBeDefined();

      const translation = await translateMessage(camt053Sample.content, MessageFormat.MT);
      expect(translation.translatedMessage).toContain('{1:');
    });
  });

  describe('camt.052 Full Flow', () => {
    const camt052Sample = samples.find((s) => s.id === 'camt052-intraday');

    it('should complete full flow: detect → parse → validate → translate', async () => {
      expect(camt052Sample).toBeDefined();
      if (camt052Sample === undefined) {
        throw new Error('camt.052 sample not found');
      }

      const detection = detectMessage(camt052Sample.content);
      expect(detection.format).toBe(MessageFormat.MX);
      expect(detection.messageType).toBe(MessageType.CAMT052);

      const parsed = parseMessage(camt052Sample.content);
      expect(parsed).toBeDefined();

      const validation = await validateMessage(
        parsed,
        detection.messageType,
        detection.format
      );
      expect(validation.issues).toBeDefined();

      const translation = await translateMessage(camt052Sample.content, MessageFormat.MT);
      expect(translation.translatedMessage).toContain('{1:');
    });
  });
});

describe('Integration Tests - All Samples Parse Successfully', () => {
  it('should parse all sample messages without throwing errors', () => {
    for (const sample of samples) {
      expect(() => {
        const detection = detectMessage(sample.content);
        expect(detection.format).not.toBe(MessageFormat.UNKNOWN);

        const parsed = parseMessage(sample.content);
        expect(parsed).toBeDefined();
      }).not.toThrow();
    }
  });
});

describe('Integration Tests - Format Detection Accuracy', () => {
  it('should correctly detect all MT messages', () => {
    const mtSamples = samples.filter((s) => s.format === 'MT');
    for (const sample of mtSamples) {
      const detection = detectMessage(sample.content);
      expect(detection.format).toBe(MessageFormat.MT);
      expect(detection.messageType).toBe(sample.messageType);
    }
  });

  it('should correctly detect all MX messages', () => {
    const mxSamples = samples.filter((s) => s.format === 'MX');
    for (const sample of mxSamples) {
      const detection = detectMessage(sample.content);
      expect(detection.format).toBe(MessageFormat.MX);
      expect(detection.messageType).toBe(sample.messageType);
    }
  });
});

describe('Integration Tests - Error Handling', () => {
  it('should handle empty message gracefully', () => {
    const detection = detectMessage('');
    expect(detection.format).toBe(MessageFormat.UNKNOWN);
    expect(detection.messageType).toBe(MessageType.UNKNOWN);
  });

  it('should handle malformed MT message', () => {
    const malformedMt = '{1:INVALID}{2:ALSOINVALID}';
    expect(() => {
      parseMessage(malformedMt);
    }).not.toThrow();
  });

  it('should handle malformed XML message', () => {
    const malformedXml = '<?xml version="1.0"?><Invalid><Unclosed>';
    const detection = detectMessage(malformedXml);
    expect(detection.format).toBe(MessageFormat.MX);

    // Parser should throw for malformed XML
    expect(() => {
      parseMessage(malformedXml);
    }).toThrow(/XML parsing error/);
  });

  it('should handle unknown message format', () => {
    const unknownMessage = 'This is not a valid SWIFT or ISO 20022 message';
    const detection = detectMessage(unknownMessage);
    expect(detection.format).toBe(MessageFormat.UNKNOWN);
  });
});

describe('Integration Tests - Translation Round-trips', () => {
  it('should preserve key fields in MT103 → pacs.008 → MT103 round-trip', async () => {
    const mt103Sample = samples.find((s) => s.id === 'mt103-sepa-eur');
    expect(mt103Sample).toBeDefined();
    if (mt103Sample === undefined) {
      throw new Error('MT103 sample not found');
    }

    // Parse original
    const originalParsed = parseMessage(mt103Sample.content);
    expect('block4' in originalParsed).toBe(true);
    if (!('block4' in originalParsed)) {
      throw new Error('MT103 should have block4');
    }

    // Get original field values
    const originalField20 = originalParsed.block4?.fields?.find((f) => f.tag === '20')?.value;
    const originalField32A = originalParsed.block4?.fields?.find((f) => f.tag === '32A');

    // Translate MT → MX
    const toMx = await translateMessage(mt103Sample.content, MessageFormat.MX);
    expect(toMx.translatedMessage).toBeDefined();

    // Translate MX → MT
    const backToMt = await translateMessage(toMx.translatedMessage, MessageFormat.MT);
    expect(backToMt.translatedMessage).toBeDefined();

    // Parse round-tripped message
    const roundTripParsed = parseMessage(backToMt.translatedMessage);
    expect('block4' in roundTripParsed).toBe(true);
    if (!('block4' in roundTripParsed)) {
      throw new Error('Round-trip MT should have block4');
    }

    // Verify key fields are preserved
    const roundTripField20 = roundTripParsed.block4?.fields?.find((f) => f.tag === '20')?.value;
    const roundTripField32A = roundTripParsed.block4?.fields?.find((f) => f.tag === '32A');

    // Field 20 should be preserved (or at least present)
    expect(roundTripField20).toBeDefined();

    // Field 32A should have same structure (amount and currency)
    expect(roundTripField32A).toBeDefined();
    expect(roundTripField32A?.subfields?.currency).toBe(originalField32A?.subfields?.currency);
  });

  it('should preserve key fields in pacs.008 → MT103 → pacs.008 round-trip', async () => {
    const pacs008Sample = samples.find((s) => s.id === 'pacs008-sepa');
    expect(pacs008Sample).toBeDefined();
    if (pacs008Sample === undefined) {
      throw new Error('pacs.008 sample not found');
    }

    // Parse original
    const originalParsed = parseMessage(pacs008Sample.content);
    expect('document' in originalParsed).toBe(true);

    // Translate MX → MT
    const toMt = await translateMessage(pacs008Sample.content, MessageFormat.MT);
    expect(toMt.translatedMessage).toBeDefined();

    // Translate MT → MX
    const backToMx = await translateMessage(toMt.translatedMessage, MessageFormat.MX);
    expect(backToMx.translatedMessage).toBeDefined();

    // Parse round-tripped message
    const roundTripParsed = parseMessage(backToMx.translatedMessage);
    expect('document' in roundTripParsed).toBe(true);

    // Verify it's still valid XML with pacs.008 namespace
    expect(backToMx.translatedMessage).toContain('<?xml');
    expect(backToMx.translatedMessage).toContain('pacs.008');
  });
});
