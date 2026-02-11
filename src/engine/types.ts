/**
 * Shared TypeScript types for the paymsg playground engine
 */

/**
 * Message type enumeration
 */
export enum MessageType {
  MT103 = 'MT103',
  MT202 = 'MT202',
  MT940 = 'MT940',
  MT942 = 'MT942',
  PACS008 = 'pacs.008.001.10',
  PACS009 = 'pacs.009.001.10',
  CAMT053 = 'camt.053.001.10',
  CAMT052 = 'camt.052.001.10',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Message format (MT or MX)
 */
export enum MessageFormat {
  MT = 'MT',
  MX = 'MX',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Severity levels for validation issues
 */
export enum Severity {
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO',
}

/**
 * MT Field structure with tag, value, and optional subfields
 */
export interface MtField {
  tag: string;
  value: string;
  subfields?: Record<string, string>;
}

/**
 * MT Block 1: Basic Header
 */
export interface MtBlock1 {
  app_id: string;
  service_id: string;
  lt_address: string;
  session_number: string;
  sequence_number: string;
}

/**
 * MT Block 2: Application Header (Input or Output)
 */
export interface MtBlock2 {
  direction: 'I' | 'O';
  message_type: string;
  destination_address?: string;
  priority?: string;
  delivery_monitoring?: string;
  obsolescence_period?: string;
}

/**
 * MT Block 3: User Header (optional tag-value pairs)
 */
export interface MtBlock3 {
  tags: Record<string, string>;
}

/**
 * MT Block 4: Text Block (main message fields)
 */
export interface MtBlock4 {
  fields: MtField[];
}

/**
 * MT Block 5: Trailer (optional tag-value pairs)
 */
export interface MtBlock5 {
  tags: Record<string, string>;
}

/**
 * Parsed MT message structure
 */
export interface MtMessage {
  block1?: MtBlock1;
  block2?: MtBlock2;
  block3?: MtBlock3;
  block4?: MtBlock4;
  block5?: MtBlock5;
}

/**
 * Parsed MX (XML) message structure
 */
export interface MxMessage {
  namespace: string;
  document: Document;
  root: Element;
}

/**
 * Generic parsed message (MT or MX)
 */
export type ParsedMessage = MtMessage | MxMessage;

/**
 * Validation issue details
 */
export interface ValidationIssue {
  id: string;
  severity: Severity;
  field_path: string;
  message: string;
  suggestion?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

/**
 * Data loss warning categories
 */
export enum DataLossCategory {
  TRUNCATION = 'Truncation',
  NO_EQUIVALENT = 'NoEquivalent',
  PRECISION_LOSS = 'PrecisionLoss',
  OPTIONAL_FIELD = 'OptionalField',
  FORMAT_CHANGE = 'FormatChange',
}

/**
 * Data loss warning
 */
export interface DataLossWarning {
  field_path: string;
  category: DataLossCategory;
  description: string;
}

/**
 * Translation result
 */
export interface TranslationResult {
  success: boolean;
  translated_message?: string;
  warnings: DataLossWarning[];
  error?: string;
}

/**
 * Message detection result
 */
export interface DetectionResult {
  format: MessageFormat;
  messageType: MessageType;
  confidence: number;
}

/**
 * Type guard to check if parsed message is MT
 */
export function isMtMessage(message: ParsedMessage): message is MtMessage {
  return 'block1' in message || 'block2' in message || 'block4' in message;
}

/**
 * Type guard to check if parsed message is MX
 */
export function isMxMessage(message: ParsedMessage): message is MxMessage {
  return 'document' in message && 'namespace' in message;
}
