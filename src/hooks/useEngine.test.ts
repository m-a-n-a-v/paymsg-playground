import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEngine } from './useEngine';
import type { DetectionResult } from '../engine/types';
import { MessageFormat, MessageType } from '../engine/types';

describe('useEngine', () => {
  const sampleMT103 = `{1:F01BANKBEBBAXXX0000000000}{2:I103BANKUS33XXXXN}{4:
:20:REF123456
:23B:CRED
:32A:240101EUR1234,56
:50K:/BE68539007547034
John Doe
Main Street 1
:59:/DE89370400440532013000
Jane Smith
High Street 2
:71A:SHA
-}`;

  const samplePacs008 = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>MSG123456</MsgId>
      <CreDtTm>2024-01-01T10:00:00</CreDtTm>
    </GrpHdr>
  </FIToFICstmrCdtTrf>
</Document>`;

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useEngine());

    expect(result.current.inputMessage).toBe('');
    expect(result.current.outputContent).toBe('');
    expect(result.current.parsedMessage).toBeNull();
    expect(result.current.detectionResult).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should set input message', () => {
    const { result } = renderHook(() => useEngine());

    act(() => {
      result.current.setInputMessage('test message');
    });

    expect(result.current.inputMessage).toBe('test message');
  });

  it('should detect format when setting input message', () => {
    const { result } = renderHook(() => useEngine());

    act(() => {
      result.current.setInputMessage(sampleMT103);
    });

    expect(result.current.detectionResult).not.toBeNull();
    expect(result.current.detectionResult?.format).toBe(MessageFormat.MT);
    expect(result.current.detectionResult?.messageType).toBe(MessageType.MT103);
  });

  it('should clear detection when input is empty', () => {
    const { result } = renderHook(() => useEngine());

    act(() => {
      result.current.setInputMessage(sampleMT103);
    });

    expect(result.current.detectionResult).not.toBeNull();

    act(() => {
      result.current.setInputMessage('   ');
    });

    expect(result.current.detectionResult).toBeNull();
  });

  it('should parse MT103 message successfully', () => {
    const { result } = renderHook(() => useEngine());

    act(() => {
      result.current.setInputMessage(sampleMT103);
    });

    act(() => {
      result.current.parse();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.parsedMessage).not.toBeNull();
    expect(result.current.outputContent).not.toBe('');
    expect(result.current.outputLanguage).toBe('json');
    expect(result.current.outputContent).toContain('REF123456');
  });

  it('should parse pacs.008 message successfully', () => {
    const { result } = renderHook(() => useEngine());

    act(() => {
      result.current.setInputMessage(samplePacs008);
    });

    act(() => {
      result.current.parse();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.parsedMessage).not.toBeNull();
    expect(result.current.outputContent).not.toBe('');
    expect(result.current.outputLanguage).toBe('json');
  });

  it('should show error when parsing empty message', () => {
    const { result } = renderHook(() => useEngine());

    act(() => {
      result.current.parse();
    });

    expect(result.current.error).toBe('No message to parse');
    expect(result.current.outputContent).toBe('');
    expect(result.current.parsedMessage).toBeNull();
  });

  it('should show error when parsing invalid format', () => {
    const { result } = renderHook(() => useEngine());

    act(() => {
      result.current.setInputMessage('invalid message format');
    });

    act(() => {
      result.current.parse();
    });

    expect(result.current.error).toBe('Unable to detect message format');
    expect(result.current.parsedMessage).toBeNull();
  });

  it('should handle parse errors gracefully', () => {
    const { result } = renderHook(() => useEngine());

    // Incomplete MT message that will be detected but fail to parse properly
    const malformedMT = '{1:F01BANKBEBBAXXX0000000000}{2:I103BANKUS33XXXXN}{4:\n:20:REF\n';

    act(() => {
      result.current.setInputMessage(malformedMT);
    });

    act(() => {
      result.current.parse();
    });

    // Parser might return a partial result, but we still have a parsed structure
    // The important thing is it doesn't crash
    expect(result.current.parsedMessage).not.toBeNull();
  });

  it('should clear all state', () => {
    const { result } = renderHook(() => useEngine());

    // Set some state
    act(() => {
      result.current.setInputMessage(sampleMT103);
    });

    act(() => {
      result.current.parse();
    });

    expect(result.current.inputMessage).not.toBe('');
    expect(result.current.outputContent).not.toBe('');

    // Clear
    act(() => {
      result.current.clear();
    });

    expect(result.current.inputMessage).toBe('');
    expect(result.current.outputContent).toBe('');
    expect(result.current.parsedMessage).toBeNull();
    expect(result.current.detectionResult).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should format parsed output as JSON', () => {
    const { result } = renderHook(() => useEngine());

    act(() => {
      result.current.setInputMessage(sampleMT103);
    });

    act(() => {
      result.current.parse();
    });

    const output = result.current.outputContent;
    expect(() => {
      const parsed: unknown = JSON.parse(output);
      return parsed;
    }).not.toThrow();
    expect(output).toContain('block1');
    expect(output).toContain('block2');
    expect(output).toContain('block4');
  });

  it('should set output as read-only after parsing', () => {
    const { result } = renderHook(() => useEngine());

    act(() => {
      result.current.setInputMessage(sampleMT103);
    });

    act(() => {
      result.current.parse();
    });

    expect(result.current.isReadOnly).toBe(true);
  });

  it('should use detectFormat helper correctly', () => {
    const { result } = renderHook(() => useEngine());

    let detection: DetectionResult | undefined;
    act(() => {
      detection = result.current.detectFormat(sampleMT103);
    });

    expect(detection).toBeDefined();
    expect(detection?.format).toBe(MessageFormat.MT);
    expect(detection?.messageType).toBe(MessageType.MT103);
  });

  it('should validate MT103 message successfully', async () => {
    const { result } = renderHook(() => useEngine());

    act(() => {
      result.current.setInputMessage(sampleMT103);
    });

    await act(async () => {
      await result.current.validate();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.validationResult).not.toBeNull();
    expect(result.current.validationResult?.issues).toBeDefined();
  });

  it('should validate pacs.008 message successfully', async () => {
    const { result } = renderHook(() => useEngine());

    act(() => {
      result.current.setInputMessage(samplePacs008);
    });

    await act(async () => {
      await result.current.validate();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.validationResult).not.toBeNull();
  });

  it('should show error when validating empty message', async () => {
    const { result } = renderHook(() => useEngine());

    await act(async () => {
      await result.current.validate();
    });

    expect(result.current.error).toBe('No message to validate');
    expect(result.current.validationResult).toBeNull();
  });

  it('should show error when validating invalid format', async () => {
    const { result } = renderHook(() => useEngine());

    act(() => {
      result.current.setInputMessage('invalid message format');
    });

    await act(async () => {
      await result.current.validate();
    });

    expect(result.current.error).toBe('Unable to detect message format');
    expect(result.current.validationResult).toBeNull();
  });

  it('should clear validation result when clearing state', () => {
    const { result } = renderHook(() => useEngine());

    act(() => {
      result.current.setInputMessage(sampleMT103);
    });

    act(() => {
      result.current.clear();
    });

    expect(result.current.validationResult).toBeNull();
  });

  it('should detect format when validating', async () => {
    const { result } = renderHook(() => useEngine());

    act(() => {
      result.current.setInputMessage(sampleMT103);
    });

    await act(async () => {
      await result.current.validate();
    });

    expect(result.current.detectionResult).not.toBeNull();
    expect(result.current.detectionResult?.format).toBe(MessageFormat.MT);
  });

  it('should translate MT103 to pacs.008 successfully', async () => {
    const { result } = renderHook(() => useEngine());

    act(() => {
      result.current.setInputMessage(sampleMT103);
    });

    await act(async () => {
      await result.current.translate(MessageFormat.MX);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.translationResult).not.toBeNull();
    expect(result.current.translationResult?.sourceFormat).toBe(MessageFormat.MT);
    expect(result.current.translationResult?.targetFormat).toBe(MessageFormat.MX);
    expect(result.current.translationResult?.translatedMessage).toContain('Document');
  });

  it('should translate pacs.008 to MT103 successfully', async () => {
    const { result } = renderHook(() => useEngine());

    act(() => {
      result.current.setInputMessage(samplePacs008);
    });

    await act(async () => {
      await result.current.translate(MessageFormat.MT);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.translationResult).not.toBeNull();
    expect(result.current.translationResult?.sourceFormat).toBe(MessageFormat.MX);
    expect(result.current.translationResult?.targetFormat).toBe(MessageFormat.MT);
    expect(result.current.translationResult?.translatedMessage).toContain('{1:');
  });

  it('should show error when translating empty message', async () => {
    const { result } = renderHook(() => useEngine());

    await act(async () => {
      await result.current.translate(MessageFormat.MX);
    });

    expect(result.current.error).toBe('No message to translate');
    expect(result.current.translationResult).toBeNull();
  });

  it('should show error when translating invalid format', async () => {
    const { result } = renderHook(() => useEngine());

    act(() => {
      result.current.setInputMessage('invalid message format');
    });

    await act(async () => {
      await result.current.translate(MessageFormat.MX);
    });

    expect(result.current.error).toBe('Unable to detect message format');
    expect(result.current.translationResult).toBeNull();
  });

  it('should show error when translating to same format', async () => {
    const { result } = renderHook(() => useEngine());

    act(() => {
      result.current.setInputMessage(sampleMT103);
    });

    await act(async () => {
      await result.current.translate(MessageFormat.MT);
    });

    expect(result.current.error).toBe('Cannot translate to the same format (MT)');
    expect(result.current.translationResult).toBeNull();
  });

  it('should clear translation result when clearing state', () => {
    const { result } = renderHook(() => useEngine());

    act(() => {
      result.current.setInputMessage(sampleMT103);
    });

    act(() => {
      result.current.clear();
    });

    expect(result.current.translationResult).toBeNull();
  });

  it('should detect format when translating', async () => {
    const { result } = renderHook(() => useEngine());

    act(() => {
      result.current.setInputMessage(sampleMT103);
    });

    await act(async () => {
      await result.current.translate(MessageFormat.MX);
    });

    expect(result.current.detectionResult).not.toBeNull();
    expect(result.current.detectionResult?.format).toBe(MessageFormat.MT);
  });
});
