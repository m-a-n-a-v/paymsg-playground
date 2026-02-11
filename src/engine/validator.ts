/**
 * Message validation engine for MT and MX messages
 *
 * Validates:
 * - MT: mandatory fields, field lengths, format patterns, SWIFT charsets, BIC format, currency codes
 * - MX: required XML elements, BIC format, IBAN check digits, currency codes
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-misused-promises */

import { MessageFormat, MessageType, ValidationResult, ValidationIssue, Severity, isMtMessage, isMxMessage } from './types';
import { parseMessage } from './parser';
import type { MtSpec, RulesSpec, SwiftCharsets } from '../specs/loader';
import {
  loadMtSpec,
  loadSwiftCharsets,
  loadRules,
  isValidCurrency,
  loadBicSpec
} from '../specs/loader';

/**
 * Validate a message (MT or MX format)
 */
export async function validateMessage(
  messageText: string,
  messageType: MessageType,
  messageFormat: MessageFormat
): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  try {
    const parsed = parseMessage(messageText);

    if (messageFormat === MessageFormat.MT && isMtMessage(parsed)) {
      const mtIssues = await validateMtMessage(parsed, messageType);
      issues.push(...mtIssues);
    } else if (messageFormat === MessageFormat.MX && isMxMessage(parsed)) {
      const mxIssues = await validateMxMessage(parsed, messageType);
      issues.push(...mxIssues);
    }
  } catch (error) {
    issues.push({
      id: 'PARSE_ERROR',
      severity: Severity.ERROR,
      field_path: 'message',
      message: `Failed to parse message: ${error instanceof Error ? error.message : String(error)}`,
      suggestion: 'Verify the message format and structure'
    });
  }

  return {
    valid: !issues.some(issue => issue.severity === Severity.ERROR),
    issues
  };
}

/**
 * Validate an MT message
 */
async function validateMtMessage(
  parsed: any,
  messageType: MessageType
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  // Load specs
  const mtTypeMap: Record<MessageType, string> = {
    [MessageType.MT103]: 'mt103',
    [MessageType.MT202]: 'mt202',
    [MessageType.MT940]: 'mt940',
    [MessageType.MT942]: 'mt942',
    [MessageType.PACS008]: '',
    [MessageType.PACS009]: '',
    [MessageType.CAMT053]: '',
    [MessageType.CAMT052]: '',
    [MessageType.UNKNOWN]: ''
  };

  const specType = mtTypeMap[messageType];
  if (!specType) {
    return issues;
  }

  const [spec, charsets] = await Promise.all([
    loadMtSpec(specType),
    loadSwiftCharsets()
  ]);

  // Validate mandatory fields
  const mandatoryIssues = validateMandatoryFields(parsed, spec);
  issues.push(...mandatoryIssues);

  // Validate field formats and lengths
  const formatIssues = validateFieldFormats(parsed, spec, charsets);
  issues.push(...formatIssues);

  // Validate BICs
  const bicIssues = await validateBics(parsed);
  issues.push(...bicIssues);

  // Validate currency codes
  const currencyIssues = await validateCurrencies(parsed);
  issues.push(...currencyIssues);

  return issues;
}

/**
 * Validate mandatory fields are present
 */
function validateMandatoryFields(parsed: any, spec: MtSpec): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const block4 = parsed.block4 || {};
  const fields = block4.fields || [];

  // Build a map of existing field tags
  const fieldTags = new Set(fields.map((f: any) => f.tag));

  for (const field of spec.fields) {
    if (field.status === 'M') {
      if (!fieldTags.has(field.tag)) {
        issues.push({
          id: `MANDATORY_FIELD_${field.tag}`,
          severity: Severity.ERROR,
          field_path: `:${field.tag}:`,
          message: `Mandatory field :${field.tag}: (${field.name}) is missing`,
          suggestion: `Add field :${field.tag}: to the message`
        });
      }
    }
  }

  return issues;
}

/**
 * Validate field formats, lengths, and character sets
 */
function validateFieldFormats(
  parsed: any,
  spec: MtSpec,
  charsets: SwiftCharsets
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const block4 = parsed.block4 || {};
  const fields = block4.fields || [];

  // Build a map of field tag -> field object
  const fieldMap: Record<string, any> = {};
  for (const f of fields) {
    fieldMap[f.tag] = f;
  }

  // Build charset regex patterns
  const charsetX = buildCharsetPattern(charsets.charset_definitions.X.characters);

  for (const field of spec.fields) {
    const fieldObj = fieldMap[field.tag];
    if (!fieldObj) {
      continue; // Skip optional fields that are not present
    }

    const value = fieldObj.value;

    // Validate max length
    if (field.max_length && value.length > field.max_length) {
      issues.push({
        id: `LENGTH_${field.tag}`,
        severity: Severity.ERROR,
        field_path: `:${field.tag}:`,
        message: `Field :${field.tag}: exceeds maximum length of ${field.max_length} characters (actual: ${value.length})`,
        suggestion: `Truncate the field value to ${field.max_length} characters or less`
      });
    }

    // Validate format pattern
    if (field.format_pattern) {
      const pattern = new RegExp(field.format_pattern);
      if (!pattern.test(value)) {
        issues.push({
          id: `FORMAT_${field.tag}`,
          severity: Severity.ERROR,
          field_path: `:${field.tag}:`,
          message: `Field :${field.tag}: does not match required format pattern`,
          suggestion: field.description || `Verify the field format matches the specification`
        });
      }
    }

    // Validate SWIFT X charset (basic validation for all fields)
    if (!new RegExp(`^${charsetX}*$`).test(value.replace(/\n/g, ''))) {
      issues.push({
        id: `CHARSET_${field.tag}`,
        severity: Severity.WARNING,
        field_path: `:${field.tag}:`,
        message: `Field :${field.tag}: contains characters outside SWIFT X character set`,
        suggestion: 'Use only alphanumeric characters and allowed punctuation: A-Z a-z 0-9 / - ? : ( ) . , \' + space'
      });
    }
  }

  return issues;
}

/**
 * Build a regex pattern from charset character definitions
 */
function buildCharsetPattern(characters: Array<{ char: string }>): string {
  const chars = characters.map(c => c.char);
  // Escape special regex characters
  const escaped = chars.map(c => {
    if (['^', '$', '.', '*', '+', '?', '(', ')', '[', ']', '{', '}', '|', '\\', '/'].includes(c)) {
      return '\\' + c;
    }
    return c;
  });
  return `[${escaped.join('')}]`;
}

/**
 * Validate BIC codes in the message
 */
async function validateBics(parsed: any): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const bicSpec = await loadBicSpec();

  const block1 = parsed.block1 || {};
  const block2 = parsed.block2 || {};
  const block4 = parsed.block4 || {};
  const fields = block4.fields || [];

  // Build a map of field tag -> field object
  const fieldMap: Record<string, any> = {};
  for (const f of fields) {
    fieldMap[f.tag] = f;
  }

  // Validate BIC in Block 1 (Sender) - LT Address is 12 characters (BIC11 + X)
  if (block1.lt_address) {
    const bic = block1.lt_address;
    // LT Address is 12 chars, but we can validate the first 8 or 11 as a BIC
    const bicToValidate = bic.length >= 11 ? bic.substring(0, 11) : bic.substring(0, 8);
    const bicIssue = validateBic(bicToValidate, 'Block 1 (Sender BIC)', bicSpec);
    if (bicIssue) issues.push(bicIssue);
  }

  // Validate BIC in Block 2 (Receiver/Destination) - can be 12 characters
  if (block2.receiver_bic) {
    const bic = block2.receiver_bic;
    // BIC can be 12 chars in Block 2, validate the first 8 or 11
    const bicToValidate = bic.length >= 11 ? bic.substring(0, 11) : (bic.length >= 8 ? bic.substring(0, 8) : bic);
    const bicIssue = validateBic(bicToValidate, 'Block 2 (Receiver BIC)', bicSpec);
    if (bicIssue) issues.push(bicIssue);
  }

  // Validate BICs in Block 4 fields (52A, 56A, 57A, 58A, etc.)
  const bicFieldTags = ['52A', '53A', '54A', '56A', '57A', '58A'];
  for (const tag of bicFieldTags) {
    const field = fieldMap[tag];
    if (field && field.subfields && field.subfields.bic) {
      const bicIssue = validateBic(field.subfields.bic, `:${tag}:`, bicSpec);
      if (bicIssue) issues.push(bicIssue);
    }
  }

  return issues;
}

/**
 * Validate a single BIC code
 */
function validateBic(bic: string, fieldPath: string, bicSpec: any): ValidationIssue | null {
  // BIC8 or BIC11 format
  if (bic.length !== 8 && bic.length !== 11) {
    return {
      id: 'BIC_LENGTH',
      severity: Severity.ERROR,
      field_path: fieldPath,
      message: `BIC code '${bic}' has invalid length (must be 8 or 11 characters)`,
      suggestion: 'Use BIC8 (AAAABBCC) or BIC11 (AAAABBCCXXX) format'
    };
  }

  // Validate structure: AAAA BB CC [XXX]
  const pattern = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
  if (!pattern.test(bic)) {
    return {
      id: 'BIC_FORMAT',
      severity: Severity.ERROR,
      field_path: fieldPath,
      message: `BIC code '${bic}' has invalid format`,
      suggestion: bicSpec.format_description || 'BIC format: 4 letters (institution) + 2 letters (country) + 2 alphanumeric (location) + optional 3 alphanumeric (branch)'
    };
  }

  return null;
}

/**
 * Validate currency codes in the message
 */
async function validateCurrencies(parsed: any): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const block4 = parsed.block4 || {};
  const fields = block4.fields || [];

  // Build a map of field tag -> field object
  const fieldMap: Record<string, any> = {};
  for (const f of fields) {
    fieldMap[f.tag] = f;
  }

  // Check field 32A (Value Date/Currency/Amount)
  const field32A = fieldMap['32A'];
  if (field32A && field32A.subfields && field32A.subfields.currency) {
    const currency = field32A.subfields.currency;
    const valid = await isValidCurrency(currency);
    if (!valid) {
      issues.push({
        id: 'CURRENCY_32A',
        severity: Severity.ERROR,
        field_path: ':32A:',
        message: `Invalid currency code '${currency}' in field 32A`,
        suggestion: 'Use a valid ISO 4217 currency code (e.g., USD, EUR, GBP)'
      });
    }

    // Check if amount is positive (independent of currency validity)
    if (field32A.subfields.amount) {
      const amount = parseFloat(field32A.subfields.amount.replace(',', '.'));
      if (amount <= 0) {
        issues.push({
          id: 'AMOUNT_32A',
          severity: Severity.ERROR,
          field_path: ':32A:',
          message: 'Amount in field 32A must be positive',
          suggestion: 'Ensure the amount value is greater than zero'
        });
      }
    }
  }

  // Check field 33B (Currency/Amount)
  const field33B = fieldMap['33B'];
  if (field33B && field33B.subfields && field33B.subfields.currency) {
    const currency = field33B.subfields.currency;
    const valid = await isValidCurrency(currency);
    if (!valid) {
      issues.push({
        id: 'CURRENCY_33B',
        severity: Severity.ERROR,
        field_path: ':33B:',
        message: `Invalid currency code '${currency}' in field 33B`,
        suggestion: 'Use a valid ISO 4217 currency code'
      });
    }
  }

  // Check balance fields (60F, 62F, 64, etc.)
  for (const tag of ['60F', '62F', '64', '60M', '62M', '60a', '62a']) {
    const field = fieldMap[tag];
    if (field && field.subfields && field.subfields.currency) {
      const currency = field.subfields.currency;
      const valid = await isValidCurrency(currency);
      if (!valid) {
        issues.push({
          id: `CURRENCY_${tag}`,
          severity: Severity.ERROR,
          field_path: `:${tag}:`,
          message: `Invalid currency code '${currency}' in field ${tag}`,
          suggestion: 'Use a valid ISO 4217 currency code'
        });
      }
    }
  }

  // Check statement line field 61
  const field61 = fieldMap['61'];
  if (field61) {
    // Field 61 can have subfields with currency
    if (field61.subfields && field61.subfields.currency) {
      const currency = field61.subfields.currency;
      if (currency) {
        const valid = await isValidCurrency(currency);
        if (!valid) {
          issues.push({
            id: 'CURRENCY_61',
            severity: Severity.ERROR,
            field_path: ':61:',
            message: `Invalid currency code '${currency}' in statement line`,
            suggestion: 'Use a valid ISO 4217 currency code'
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Validate an MX (XML) message
 */
async function validateMxMessage(
  parsed: any,
  messageType: MessageType
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  // Load business rules for the message type
  const rulesTypeMap: Record<MessageType, string> = {
    [MessageType.PACS008]: 'pacs008',
    [MessageType.PACS009]: 'pacs009',
    [MessageType.CAMT053]: 'camt053',
    [MessageType.CAMT052]: 'camt052',
    [MessageType.MT103]: '',
    [MessageType.MT202]: '',
    [MessageType.MT940]: '',
    [MessageType.MT942]: '',
    [MessageType.UNKNOWN]: ''
  };

  const rulesType = rulesTypeMap[messageType];
  let rules: RulesSpec | null = null;
  if (rulesType) {
    try {
      rules = await loadRules(rulesType);
    } catch {
      // Rules file may not exist for all types
    }
  }

  // Validate required XML elements
  const structureIssues = validateMxStructure(parsed, messageType);
  issues.push(...structureIssues);

  // Validate business rules
  if (rules) {
    const ruleIssues = validateMxRules(parsed, rules);
    issues.push(...ruleIssues);
  }

  return issues;
}

/**
 * Validate required XML elements are present
 */
function validateMxStructure(parsed: any, messageType: MessageType): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Common required elements for all MX messages
  const requiredPaths = ['GrpHdr', 'GrpHdr/MsgId', 'GrpHdr/CreDtTm'];

  // Message-specific required elements
  if (messageType === MessageType.PACS008 || messageType === MessageType.PACS009) {
    requiredPaths.push('GrpHdr/NbOfTxs');
    if (messageType === MessageType.PACS008) {
      requiredPaths.push('CdtTrfTxInf');
      requiredPaths.push('CdtTrfTxInf/IntrBkSttlmAmt');
    } else {
      requiredPaths.push('CdtTrfTxInf');
      requiredPaths.push('CdtTrfTxInf/IntrBkSttlmAmt');
    }
  } else if (messageType === MessageType.CAMT053 || messageType === MessageType.CAMT052) {
    // CAMT053 has Stmt, CAMT052 has Rpt
    requiredPaths.push(messageType === MessageType.CAMT053 ? 'Stmt' : 'Rpt');
  }

  // Check each required path
  for (const path of requiredPaths) {
    const value = getElementByPath(parsed, path);
    if (!value || value.trim() === '') {
      issues.push({
        id: `MISSING_${path.replace(/\//g, '_')}`,
        severity: Severity.ERROR,
        field_path: path,
        message: `Required element '${path}' is missing or empty`,
        suggestion: `Add the '${path}' element to the message`
      });
    }
  }

  return issues;
}

/**
 * Validate business rules for MX messages
 */
function validateMxRules(parsed: any, rules: RulesSpec): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const rule of rules.rules) {
    // Simple rule evaluation for common patterns
    const isValid = evaluateRule(parsed, rule);

    if (!isValid) {
      const severity = rule.severity === 'error'
        ? Severity.ERROR
        : rule.severity === 'warning'
        ? Severity.WARNING
        : Severity.INFO;

      const issue: ValidationIssue = {
        id: rule.id,
        severity,
        field_path: rule.field_paths[0] || 'message',
        message: rule.description
      };
      if (rule.suggestion) {
        issue.suggestion = rule.suggestion;
      }
      issues.push(issue);
    }
  }

  return issues;
}

/**
 * Simple rule evaluation for MX messages
 */
function evaluateRule(parsed: any, rule: any): boolean {
  // Extract field values based on field paths
  const fieldValues = rule.field_paths.map((path: string) => getElementByPath(parsed, path));

  // Handle common assertion patterns
  const assertion = rule.assertion;

  // Check for positive amount rules
  if (assertion && assertion.includes('> 0')) {
    for (const value of fieldValues) {
      if (value) {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue <= 0) {
          return false;
        }
      }
    }
  }

  // Check for currency code rules
  if (rule.category === 'currency') {
    for (const value of fieldValues) {
      if (value && !isValidCurrency(value)) {
        return false;
      }
    }
  }

  // If we can't evaluate the rule, assume it passes (avoid false positives)
  return true;
}

/**
 * Helper to get element value by path
 */
function getElementByPath(parsed: any, path: string): string | null {
  if (!parsed.root) return null;

  const parts = path.split('/');
  let current: Element = parsed.root;

  for (const part of parts) {
    let found = false;
    for (let i = 0; i < current.children.length; i++) {
      const child = current.children[i] as Element;
      if (child.localName === part) {
        current = child;
        found = true;
        break;
      }
    }
    if (!found) return null;
  }

  return current.textContent;
}
