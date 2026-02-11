/**
 * Spec loader - loads reference data and specifications from public/specs/
 */

// ============================================================================
// Type Definitions
// ============================================================================

// Reference Data Types

export interface Currency {
  code: string;
  name: string;
  numeric_code: string;
  decimal_places: number;
  is_active: boolean;
}

export interface CurrenciesData {
  version: string;
  last_updated: string;
  currencies: Currency[];
}

export interface Country {
  alpha2: string;
  alpha3: string;
  numeric: string;
  name: string;
  is_eu_member: boolean;
}

export interface IbanFormat {
  country_code: string;
  country_name: string;
  length: number;
  bban_format: string;
  example: string;
  bank_id_position: {
    start: number;
    end: number;
  };
}

export interface BicComponent {
  name: string;
  position: string;
  length: number;
  format: string;
  description: string;
  character_set?: string;
  validation?: string;
  examples?: string[];
}

export interface BicSpec {
  $schema: string;
  title: string;
  description: string;
  version: string;
  structure: {
    description: string;
    components: BicComponent[];
  };
}

export interface SwiftCharacter {
  char: string;
  unicode: string;
  description: string;
}

export interface SwiftCharsetDefinition {
  name: string;
  description: string;
  characters: SwiftCharacter[];
  regex?: string;
}

export interface SwiftCharsets {
  charset_definitions: {
    X: SwiftCharsetDefinition;
    Y: SwiftCharsetDefinition;
    Z: SwiftCharsetDefinition;
  };
}

// MT Specs Types

export interface MtFieldSubfield {
  name: string;
  position: string;
  format: string;
  description: string;
}

export interface MtField {
  tag: string;
  name: string;
  status: 'M' | 'O'; // Mandatory or Optional
  options: string[];
  max_length: number;
  format_pattern: string;
  description: string;
  subfields: MtFieldSubfield[] | null;
}

export interface MtBlockSpec {
  format: string;
  description: string;
}

export interface MtSpec {
  message_type: string;
  name: string;
  description: string;
  blocks: {
    block1: MtBlockSpec;
    block2: MtBlockSpec;
    block3: MtBlockSpec;
    block4: MtBlockSpec;
    block5: MtBlockSpec;
  };
  fields: MtField[];
}

export interface BlockStructure {
  version: string;
  description: string;
  blocks: Record<string, unknown>;
}

// Mapping Types

export interface FieldMapping {
  mt_tag: string;
  mt_field_name: string;
  mx_path: string;
  transform_type: 'direct' | 'split' | 'merge' | 'lookup' | 'derived' | 'conditional';
  direction: 'both' | 'mt_to_mx' | 'mx_to_mt';
  data_loss_risk: 'none' | 'low' | 'medium' | 'high';
  transform_details: string;
  notes?: string;
  truncation_rule?: string;
  lookup_table?: Record<string, string>;
}

export interface MappingSpec {
  message_pair: string;
  mt_type: string;
  mx_type: string;
  description: string;
  mapping_notes: string[];
  mappings: FieldMapping[];
}

// Validation Rules Types

export interface ValidationRule {
  id: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  condition: string;
  assertion: string;
  field_paths: string[];
  suggestion: string;
  category: string;
}

export interface RulesSpec {
  message_type: string;
  description: string;
  rules: ValidationRule[];
}

// ============================================================================
// Loader Functions
// ============================================================================

const BASE_PATH = '/specs';

/**
 * Generic fetch function for loading JSON specs
 */
async function loadJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_PATH}${path}`);
  if (!response.ok) {
    throw new Error(`Failed to load spec: ${path} (${String(response.status)})`);
  }
  return response.json() as Promise<T>;
}

/**
 * Load currencies reference data
 */
export async function loadCurrencies(): Promise<CurrenciesData> {
  return loadJson<CurrenciesData>('/reference/currencies.json');
}

/**
 * Load countries reference data
 */
export async function loadCountries(): Promise<Country[]> {
  return loadJson<Country[]>('/reference/countries.json');
}

/**
 * Load IBAN formats reference data
 */
export async function loadIbanFormats(): Promise<IbanFormat[]> {
  return loadJson<IbanFormat[]>('/reference/iban_formats.json');
}

/**
 * Load BIC specification
 */
export async function loadBicSpec(): Promise<BicSpec> {
  return loadJson<BicSpec>('/reference/bic_spec.json');
}

/**
 * Load SWIFT character sets
 */
export async function loadSwiftCharsets(): Promise<SwiftCharsets> {
  return loadJson<SwiftCharsets>('/reference/swift_charsets.json');
}

/**
 * Load MT message specification
 * @param type - MT message type (e.g., 'mt103', 'mt202', 'mt940', 'mt942')
 */
export async function loadMtSpec(type: string): Promise<MtSpec> {
  const normalizedType = type.toLowerCase().replace(/^mt/, 'mt');
  return loadJson<MtSpec>(`/mt-specs/${normalizedType}.json`);
}

/**
 * Load block structure specification
 */
export async function loadBlockStructure(): Promise<BlockStructure> {
  return loadJson<BlockStructure>('/mt-specs/block_structure.json');
}

/**
 * Load mapping specification
 * @param pair - Message pair (e.g., 'mt103_pacs008', 'mt202_pacs009', 'mt940_camt053', 'mt942_camt052')
 */
export async function loadMapping(pair: string): Promise<MappingSpec> {
  const normalizedPair = pair.toLowerCase();
  return loadJson<MappingSpec>(`/mappings/${normalizedPair}.json`);
}

/**
 * Load validation rules
 * @param type - Message type (e.g., 'pacs008', 'pacs009', 'camt052', 'camt053')
 */
export async function loadRules(type: string): Promise<RulesSpec> {
  const normalizedType = type.toLowerCase().replace(/[.-]/g, '');
  return loadJson<RulesSpec>(`/rules/${normalizedType}_rules.json`);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get currency by code
 */
export async function getCurrency(code: string): Promise<Currency | undefined> {
  const data = await loadCurrencies();
  return data.currencies.find(c => c.code === code);
}

/**
 * Get country by alpha2 code
 */
export async function getCountry(code: string): Promise<Country | undefined> {
  const countries = await loadCountries();
  return countries.find(c => c.alpha2 === code || c.alpha3 === code);
}

/**
 * Get IBAN format by country code
 */
export async function getIbanFormat(countryCode: string): Promise<IbanFormat | undefined> {
  const formats = await loadIbanFormats();
  return formats.find(f => f.country_code === countryCode);
}

/**
 * Check if a currency code is valid
 */
export async function isValidCurrency(code: string): Promise<boolean> {
  const currency = await getCurrency(code);
  return currency !== undefined && currency.is_active;
}

/**
 * Check if a country code is valid
 */
export async function isValidCountry(code: string): Promise<boolean> {
  const country = await getCountry(code);
  return country !== undefined;
}
