/**
 * MT and MX message parser
 */

import type {
  MtMessage,
  MxMessage,
  MtBlock1,
  MtBlock2,
  MtBlock3,
  MtBlock4,
  MtBlock5,
  MtField,
  ParsedMessage,
} from './types';

/**
 * Parse an MT message into structured format
 */
export function parseMtMessage(message: string): MtMessage {
  const result: MtMessage = {};

  // Normalize line endings to \n
  const normalized = message.replace(/\r\n/g, '\n');

  // Extract blocks using regex
  const block1Match = normalized.match(/\{1:([^}]+)\}/);
  const block2Match = normalized.match(/\{2:([^}]+)\}/);
  const block3Match = normalized.match(/\{3:((?:\{[^}]+\})+)\}/);
  const block4Match = normalized.match(/\{4:\n([\s\S]*?)\n-\}/);
  const block5Match = normalized.match(/\{5:((?:\{[^}]+\})+)\}/);

  if (block1Match && block1Match[1]) {
    result.block1 = parseBlock1(block1Match[1]);
  }

  if (block2Match && block2Match[1]) {
    result.block2 = parseBlock2(block2Match[1]);
  }

  if (block3Match && block3Match[1]) {
    result.block3 = parseBlock3(block3Match[1]);
  }

  if (block4Match && block4Match[1]) {
    result.block4 = parseBlock4(block4Match[1]);
  }

  if (block5Match && block5Match[1]) {
    result.block5 = parseBlock5(block5Match[1]);
  }

  return result;
}

/**
 * Parse Block 1: Basic Header
 * Format: F01DEUTDEFFAXXX0000000000
 * F = app_id, 01 = service_id, DEUTDEFFAXXX = LT address, 0000 = session, 000000 = sequence
 */
function parseBlock1(content: string): MtBlock1 {
  const appId = content.substring(0, 1);
  const serviceId = content.substring(1, 3);
  const ltAddress = content.substring(3, 15);
  const sessionNumber = content.substring(15, 19);
  const sequenceNumber = content.substring(19, 25);

  return {
    app_id: appId,
    service_id: serviceId,
    lt_address: ltAddress,
    session_number: sessionNumber,
    sequence_number: sequenceNumber,
  };
}

/**
 * Parse Block 2: Application Header
 * Input format: I103BNPAFRPPXXXXN
 * Output format: O1030830123456BNPAFRPPXXXXN2
 */
function parseBlock2(content: string): MtBlock2 {
  const direction = content.substring(0, 1) as 'I' | 'O';
  const messageType = content.substring(1, 4);

  const result: MtBlock2 = {
    direction,
    message_type: messageType,
  };

  if (direction === 'I') {
    // Input message
    const destinationAddress = content.substring(4, 16);
    const priority = content.substring(16, 17);
    result.destination_address = destinationAddress;
    if (priority) {
      result.priority = priority;
    }
    // Optional delivery monitoring (1 char)
    if (content.length > 17) {
      result.delivery_monitoring = content.substring(17, 18);
    }
    // Optional obsolescence period (3 chars)
    if (content.length > 18) {
      result.obsolescence_period = content.substring(18, 21);
    }
  } else {
    // Output message
    result.destination_address = content.substring(12, 24);
    result.priority = content.substring(24, 25);
  }

  return result;
}

/**
 * Parse Block 3: User Header (optional)
 * Format: {108:TESTMUR123456}{121:uuid}
 */
function parseBlock3(content: string): MtBlock3 {
  const tags: Record<string, string> = {};
  const tagPattern = /\{(\d+):([^}]+)\}/g;
  let match;

  while ((match = tagPattern.exec(content)) !== null) {
    if (match[1] && match[2]) {
      tags[match[1]] = match[2];
    }
  }

  return { tags };
}

/**
 * Parse Block 4: Text Block (main message fields)
 * Format: :TAG:VALUE with multi-line values
 */
function parseBlock4(content: string): MtBlock4 {
  const fields: MtField[] = [];
  const lines = content.split('\n');
  let currentField: MtField | null = null;

  for (const line of lines) {
    // Check if this line starts a new field (:TAG:)
    const fieldMatch = line.match(/^:(\d{2}[A-Z]?):(.*)$/);

    if (fieldMatch && fieldMatch[1] && fieldMatch[2] !== undefined) {
      // Save previous field if exists
      if (currentField) {
        fields.push(parseFieldSubfields(currentField));
      }

      // Start new field
      currentField = {
        tag: fieldMatch[1],
        value: fieldMatch[2],
      };
    } else if (currentField && line.trim()) {
      // Continuation of current field (multi-line value)
      currentField.value += '\n' + line;
    }
  }

  // Save last field
  if (currentField) {
    fields.push(parseFieldSubfields(currentField));
  }

  return { fields };
}

/**
 * Parse Block 5: Trailer (optional)
 * Format: {CHK:123456789ABC}
 */
function parseBlock5(content: string): MtBlock5 {
  const tags: Record<string, string> = {};
  const tagPattern = /\{([A-Z]+):([^}]+)\}/g;
  let match;

  while ((match = tagPattern.exec(content)) !== null) {
    if (match[1] && match[2]) {
      tags[match[1]] = match[2];
    }
  }

  return { tags };
}

/**
 * Parse compound subfields based on field tag
 */
function parseFieldSubfields(field: MtField): MtField {
  const tag = field.tag;
  const value = field.value;

  // Field 32A: Date, Currency, Amount (YYMMDDCCCAA,AA)
  if (tag === '32A') {
    const match = value.match(/^(\d{6})([A-Z]{3})([0-9,]+)$/);
    if (match && match[1] && match[2] && match[3]) {
      field.subfields = {
        date: match[1],
        currency: match[2],
        amount: match[3],
      };
    }
  }

  // Field 33B: Currency, Amount
  if (tag === '33B') {
    const match = value.match(/^([A-Z]{3})([0-9,]+)$/);
    if (match && match[1] && match[2]) {
      field.subfields = {
        currency: match[1],
        amount: match[2],
      };
    }
  }

  // Field 50K, 59: Account (optional) + Name/Address lines
  if (tag === '50K' || tag === '59') {
    const lines = value.split('\n');
    const subfields: Record<string, string> = {};

    if (lines[0] && lines[0].startsWith('/')) {
      subfields['account'] = lines[0];
      subfields['name_address'] = lines.slice(1).join('\n');
    } else {
      subfields['name_address'] = lines.join('\n');
    }

    field.subfields = subfields;
  }

  // Field 52A, 57A: Account (optional) + BIC
  if (tag === '52A' || tag === '57A' || tag === '56A' || tag === '58A') {
    const lines = value.split('\n');
    const subfields: Record<string, string> = {};

    if (lines.length > 1) {
      if (lines[0] && lines[0].startsWith('/')) {
        subfields['account'] = lines[0];
        if (lines[1]) {
          subfields['bic'] = lines[1];
        }
      } else {
        subfields['bic'] = lines.join('');
      }
    } else {
      subfields['bic'] = value;
    }

    field.subfields = subfields;
  }

  // Field 60F, 62F, 64: D/C + Date + Currency + Amount (DYYMMDDCCCAA,AA)
  if (tag === '60F' || tag === '62F' || tag === '64') {
    const match = value.match(/^([DC])(\d{6})([A-Z]{3})([0-9,]+)$/);
    if (match && match[1] && match[2] && match[3] && match[4]) {
      field.subfields = {
        debit_credit: match[1],
        date: match[2],
        currency: match[3],
        amount: match[4],
      };
    }
  }

  // Field 61: Statement line (complex format)
  // Format: YYMMDD[MMDD]D[C]AMOUNT[N]TTTREFERENCE[//SUPPLEMENTARY]
  // YYMMDD = value date, MMDD = optional entry date, D = D/C indicator, C = funds code (optional)
  // AMOUNT = amount, N = transaction type (4 chars), TTT = customer ref, SUPPLEMENTARY = bank ref
  if (tag === '61') {
    const lines = value.split('\n');
    const firstLine = lines[0];

    if (!firstLine) {
      return field;
    }

    // Parse value date (6 digits)
    const valueDate = firstLine.substring(0, 6);
    let pos = 6;

    // Entry date (optional, can be 2 or 4 digits)
    // Check if next char is D or C (no entry date), otherwise look for entry date
    let entryDate = '';
    if (firstLine[pos] !== 'D' && firstLine[pos] !== 'C') {
      // Try 4 digits first (MMDD)
      const next4 = firstLine.substring(pos, pos + 4);
      if (/^\d{4}$/.test(next4)) {
        entryDate = next4;
        pos += 4;
      } else {
        // Try 2 digits (DD) or 1 digit
        const next2 = firstLine.substring(pos, pos + 2);
        if (/^\d{2}$/.test(next2)) {
          entryDate = next2;
          pos += 2;
        } else {
          const nextChar = firstLine[pos];
          if (nextChar && /^\d$/.test(nextChar)) {
            entryDate = nextChar;
            pos += 1;
          }
        }
      }
    }

    // Debit/Credit indicator (D or C)
    const debitCredit = firstLine.substring(pos, pos + 1);
    pos += 1;

    // Optional funds code (1 char, letter)
    let fundsCode = '';
    const fundsChar = firstLine[pos];
    if (firstLine.length > pos && fundsChar && /[A-Z]/.test(fundsChar)) {
      fundsCode = fundsChar;
      pos += 1;
    }

    // Amount (until next letter or //)
    const amountMatch = firstLine.substring(pos).match(/^([0-9,]+)/);
    const amount = amountMatch && amountMatch[1] ? amountMatch[1] : '';
    pos += amount.length;

    // Transaction type code (1 char + 3 chars = 4 total)
    const typeCode = firstLine.substring(pos, pos + 4);
    pos += 4;

    // Reference (until // or end)
    const remainingLine = firstLine.substring(pos);
    const parts = remainingLine.split('//');
    const reference = parts[0] || '';
    const supplementary = parts.length > 1 && parts[1] ? parts[1] : '';

    // Additional info on next lines
    const additionalInfo = lines.slice(1).join('\n');

    field.subfields = {
      value_date: valueDate,
      entry_date: entryDate,
      debit_credit: debitCredit,
      funds_code: fundsCode,
      amount,
      type_code: typeCode,
      reference,
      supplementary,
      additional_info: additionalInfo,
    };
  }

  return field;
}

/**
 * Parse an MX (XML) message using browser's DOMParser
 */
export function parseMxMessage(message: string): MxMessage {
  // Parse XML using browser DOMParser
  const parser = new DOMParser();
  const doc = parser.parseFromString(message, 'text/xml');

  // Check for parsing errors
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error(`XML parsing error: ${parserError.textContent}`);
  }

  // Get root Document element
  const root = doc.documentElement;

  // Extract namespace from root element
  const namespace = root.namespaceURI || '';

  return {
    namespace,
    document: doc,
    root,
  };
}

/**
 * Navigate parsed MX message by element path
 * Path format: "GrpHdr/MsgId" or "CdtTrfTxInf/PmtId/InstrId"
 * Returns the text content of the element, or null if not found
 */
export function getElementByPath(
  message: MxMessage,
  path: string
): string | null {
  const parts = path.split('/');
  let current: Element | null = message.root;

  for (const part of parts) {
    if (!current) {
      return null;
    }

    // Look for element by local name (ignoring namespace)
    let found: Element | null = null;
    for (let i = 0; i < current.children.length; i++) {
      const child: Element = current.children[i] as Element;
      if (child.localName === part) {
        found = child;
        break;
      }
    }

    current = found;
  }

  return current?.textContent || null;
}

/**
 * Get an element by path and return the Element itself (not just text content)
 * Useful for accessing attributes or nested children
 */
export function getElementNodeByPath(
  message: MxMessage,
  path: string
): Element | null {
  const parts = path.split('/');
  let current: Element | null = message.root;

  for (const part of parts) {
    if (!current) {
      return null;
    }

    // Look for element by local name (ignoring namespace)
    let found: Element | null = null;
    for (let i = 0; i < current.children.length; i++) {
      const child: Element = current.children[i] as Element;
      if (child.localName === part) {
        found = child;
        break;
      }
    }

    current = found;
  }

  return current;
}

/**
 * Get all matching elements by path (for repeated elements like entries)
 * Returns array of Elements
 */
export function getElementsByPath(
  message: MxMessage,
  path: string
): Element[] {
  const parts = path.split('/');
  const lastPart = parts[parts.length - 1];
  const parentPath = parts.slice(0, -1).join('/');

  // Get parent element
  let parent: Element | null;
  if (parentPath === '') {
    parent = message.root;
  } else {
    parent = getElementNodeByPath(message, parentPath);
  }

  if (!parent || !lastPart) {
    return [];
  }

  // Find all children with matching local name
  const results: Element[] = [];
  for (let i = 0; i < parent.children.length; i++) {
    const child: Element = parent.children[i] as Element;
    if (child.localName === lastPart) {
      results.push(child);
    }
  }

  return results;
}

/**
 * Parse a message (auto-detect format)
 */
export function parseMessage(message: string): ParsedMessage {
  const trimmed = message.trim();

  // Detect format
  if (trimmed.startsWith('{1:')) {
    return parseMtMessage(trimmed);
  } else if (trimmed.startsWith('<?xml') || trimmed.startsWith('<Document')) {
    return parseMxMessage(trimmed);
  } else {
    throw new Error('Unable to detect message format');
  }
}
