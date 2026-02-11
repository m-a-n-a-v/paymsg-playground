/**
 * Message format and type detection
 */

import { MessageFormat, MessageType, DetectionResult } from './types';

/**
 * Auto-detect message format and type from raw message content
 */
export function detectMessage(message: string): DetectionResult {
  const trimmed = message.trim();

  // Empty message
  if (!trimmed) {
    return {
      format: MessageFormat.UNKNOWN,
      messageType: MessageType.UNKNOWN,
      confidence: 0,
    };
  }

  // Check for MT format (starts with {1:)
  if (trimmed.startsWith('{1:')) {
    const messageType = detectMtType(trimmed);
    return {
      format: MessageFormat.MT,
      messageType,
      confidence: messageType !== MessageType.UNKNOWN ? 1.0 : 0.7,
    };
  }

  // Check for XML format (starts with <?xml or <Document)
  if (trimmed.startsWith('<?xml') || trimmed.startsWith('<Document')) {
    const messageType = detectMxType(trimmed);
    return {
      format: MessageFormat.MX,
      messageType,
      confidence: messageType !== MessageType.UNKNOWN ? 1.0 : 0.7,
    };
  }

  // Unknown format
  return {
    format: MessageFormat.UNKNOWN,
    messageType: MessageType.UNKNOWN,
    confidence: 0,
  };
}

/**
 * Detect specific MT message type from Block 2
 */
function detectMtType(message: string): MessageType {
  // Block 2 format for Input: {2:I<msg_type><destination>...}
  // Block 2 format for Output: {2:O<msg_type><time>...}
  const block2Match = message.match(/\{2:[IO](\d{3})/);

  if (block2Match) {
    const msgType = block2Match[1];
    switch (msgType) {
      case '103':
        return MessageType.MT103;
      case '202':
        return MessageType.MT202;
      case '940':
        return MessageType.MT940;
      case '942':
        return MessageType.MT942;
      default:
        return MessageType.UNKNOWN;
    }
  }

  return MessageType.UNKNOWN;
}

/**
 * Detect specific MX message type from XML namespace
 */
function detectMxType(message: string): MessageType {
  // Check for namespace in root element or xmlns declaration
  const namespacePatterns = [
    { pattern: /pacs\.008\.001\.10/, type: MessageType.PACS008 },
    { pattern: /pacs\.009\.001\.10/, type: MessageType.PACS009 },
    { pattern: /camt\.053\.001\.10/, type: MessageType.CAMT053 },
    { pattern: /camt\.052\.001\.10/, type: MessageType.CAMT052 },
  ];

  for (const { pattern, type } of namespacePatterns) {
    if (pattern.test(message)) {
      return type;
    }
  }

  return MessageType.UNKNOWN;
}

/**
 * Check if message is MT format
 */
export function isMtFormat(message: string): boolean {
  return detectMessage(message).format === MessageFormat.MT;
}

/**
 * Check if message is MX (XML) format
 */
export function isMxFormat(message: string): boolean {
  return detectMessage(message).format === MessageFormat.MX;
}

/**
 * Get message type name as a friendly string
 */
export function getMessageTypeName(type: MessageType): string {
  switch (type) {
    case MessageType.MT103:
      return 'MT103 - Customer Credit Transfer';
    case MessageType.MT202:
      return 'MT202 - FI Credit Transfer';
    case MessageType.MT940:
      return 'MT940 - Customer Statement';
    case MessageType.MT942:
      return 'MT942 - Interim Transaction Report';
    case MessageType.PACS008:
      return 'pacs.008 - Customer Credit Transfer';
    case MessageType.PACS009:
      return 'pacs.009 - FI Credit Transfer';
    case MessageType.CAMT053:
      return 'camt.053 - Bank-to-Customer Statement';
    case MessageType.CAMT052:
      return 'camt.052 - Interim Report';
    case MessageType.UNKNOWN:
      return 'Unknown Message Type';
  }
}
