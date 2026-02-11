import { describe, it, expect } from 'vitest';
import {
  loadCurrencies,
  loadCountries,
  loadIbanFormats,
  loadBicSpec,
  loadSwiftCharsets,
  loadMtSpec,
  loadBlockStructure,
  loadMapping,
  loadRules,
  getCurrency,
  getCountry,
  getIbanFormat,
  isValidCurrency,
  isValidCountry,
} from './loader';

describe('Spec Loader - Reference Data', () => {
  it('should load currencies data', async () => {
    const data = await loadCurrencies();
    expect(data).toBeDefined();
    expect(data.version).toBeDefined();
    expect(data.currencies).toBeInstanceOf(Array);
    expect(data.currencies.length).toBeGreaterThan(0);

    const usd = data.currencies.find(c => c.code === 'USD');
    expect(usd).toBeDefined();
    expect(usd?.name).toBe('US Dollar');
    expect(usd?.decimal_places).toBe(2);
    expect(usd?.is_active).toBe(true);
  });

  it('should load countries data', async () => {
    const countries = await loadCountries();
    expect(countries).toBeInstanceOf(Array);
    expect(countries.length).toBeGreaterThan(0);

    const us = countries.find(c => c.alpha2 === 'US');
    expect(us).toBeDefined();
    expect(us?.alpha3).toBe('USA');
    expect(us?.name).toBe('United States of America');
  });

  it('should load IBAN formats', async () => {
    const formats = await loadIbanFormats();
    expect(formats).toBeInstanceOf(Array);
    expect(formats.length).toBeGreaterThan(0);

    const de = formats.find(f => f.country_code === 'DE');
    expect(de).toBeDefined();
    expect(de?.length).toBe(22);
    expect(de?.example).toBeDefined();
  });

  it('should load BIC specification', async () => {
    const spec = await loadBicSpec();
    expect(spec).toBeDefined();
    expect(spec.structure).toBeDefined();
    expect(spec.structure.components).toBeInstanceOf(Array);
    expect(spec.structure.components.length).toBeGreaterThan(0);

    const institutionCode = spec.structure.components.find(
      c => c.name === 'institution_code'
    );
    expect(institutionCode).toBeDefined();
    expect(institutionCode?.length).toBe(4);
  });

  it('should load SWIFT character sets', async () => {
    const charsets = await loadSwiftCharsets();
    expect(charsets).toBeDefined();
    expect(charsets.charset_definitions).toBeDefined();
    expect(charsets.charset_definitions.X).toBeDefined();
    expect(charsets.charset_definitions.Y).toBeDefined();
    expect(charsets.charset_definitions.Z).toBeDefined();

    const xCharset = charsets.charset_definitions.X;
    expect(xCharset.name).toBe('SWIFT X Character Set');
    expect(xCharset.characters).toBeInstanceOf(Array);
    expect(xCharset.characters.length).toBeGreaterThan(0);
  });
});

describe('Spec Loader - MT Specs', () => {
  it('should load MT103 specification', async () => {
    const spec = await loadMtSpec('mt103');
    expect(spec).toBeDefined();
    expect(spec.message_type).toBe('MT103');
    expect(spec.name).toBeDefined();
    expect(spec.blocks).toBeDefined();
    expect(spec.fields).toBeInstanceOf(Array);

    const field20 = spec.fields.find(f => f.tag === '20');
    expect(field20).toBeDefined();
    expect(field20?.name).toBe('Transaction Reference Number');
    expect(field20?.status).toBe('M');
  });

  it('should load MT202 specification', async () => {
    const spec = await loadMtSpec('mt202');
    expect(spec).toBeDefined();
    expect(spec.message_type).toBe('MT202');
  });

  it('should load MT940 specification', async () => {
    const spec = await loadMtSpec('mt940');
    expect(spec).toBeDefined();
    expect(spec.message_type).toBe('MT940');
  });

  it('should load MT942 specification', async () => {
    const spec = await loadMtSpec('mt942');
    expect(spec).toBeDefined();
    expect(spec.message_type).toBe('MT942');
  });

  it('should load block structure specification', async () => {
    const spec = await loadBlockStructure();
    expect(spec).toBeDefined();
    expect(spec.description).toBeDefined();
    expect(spec.blocks).toBeDefined();
  });
});

describe('Spec Loader - Mappings', () => {
  it('should load MT103/pacs.008 mapping', async () => {
    const mapping = await loadMapping('mt103_pacs008');
    expect(mapping).toBeDefined();
    expect(mapping.mt_type).toBe('MT103');
    expect(mapping.mx_type).toBe('pacs.008.001.10');
    expect(mapping.mappings).toBeInstanceOf(Array);
    expect(mapping.mappings.length).toBeGreaterThan(0);

    const field20Mapping = mapping.mappings.find(m => m.mt_tag === '20');
    expect(field20Mapping).toBeDefined();
  });

  it('should load MT202/pacs.009 mapping', async () => {
    const mapping = await loadMapping('mt202_pacs009');
    expect(mapping).toBeDefined();
    expect(mapping.mt_type).toBe('MT202');
    expect(mapping.mx_type).toBe('pacs.009.001.10');
  });

  it('should load MT940/camt.053 mapping', async () => {
    const mapping = await loadMapping('mt940_camt053');
    expect(mapping).toBeDefined();
    expect(mapping.mt_type).toBe('MT940');
    expect(mapping.mx_type).toBe('camt.053.001.10');
  });

  it('should load MT942/camt.052 mapping', async () => {
    const mapping = await loadMapping('mt942_camt052');
    expect(mapping).toBeDefined();
    expect(mapping.mt_type).toBe('MT942');
    expect(mapping.mx_type).toBe('camt.052.001.10');
  });
});

describe('Spec Loader - Validation Rules', () => {
  it('should load pacs.008 rules', async () => {
    const rules = await loadRules('pacs008');
    expect(rules).toBeDefined();
    expect(rules.message_type).toBe('pacs.008.001.10');
    expect(rules.rules).toBeInstanceOf(Array);
    expect(rules.rules.length).toBeGreaterThan(0);

    const rule = rules.rules[0];
    expect(rule).toBeDefined();
    if (rule) {
      expect(rule.id).toBeDefined();
      expect(rule.severity).toMatch(/^(error|warning|info)$/);
      expect(rule.field_paths).toBeInstanceOf(Array);
    }
  });

  it('should load pacs.009 rules', async () => {
    const rules = await loadRules('pacs009');
    expect(rules).toBeDefined();
    expect(rules.message_type).toBe('pacs.009.001.10');
  });

  it('should load camt.052 rules', async () => {
    const rules = await loadRules('camt052');
    expect(rules).toBeDefined();
    expect(rules.message_type).toBe('camt.052.001.10');
  });

  it('should load camt.053 rules', async () => {
    const rules = await loadRules('camt053');
    expect(rules).toBeDefined();
    expect(rules.message_type).toBe('camt.053.001.10');
  });
});

describe('Spec Loader - Helper Functions', () => {
  it('should get currency by code', async () => {
    const usd = await getCurrency('USD');
    expect(usd).toBeDefined();
    expect(usd?.code).toBe('USD');
    expect(usd?.name).toBe('US Dollar');

    const eur = await getCurrency('EUR');
    expect(eur).toBeDefined();
    expect(eur?.code).toBe('EUR');

    const invalid = await getCurrency('INVALID');
    expect(invalid).toBeUndefined();
  });

  it('should get country by code', async () => {
    const us = await getCountry('US');
    expect(us).toBeDefined();
    expect(us?.alpha2).toBe('US');

    const usa = await getCountry('USA');
    expect(usa).toBeDefined();
    expect(usa?.alpha3).toBe('USA');

    const invalid = await getCountry('INVALID');
    expect(invalid).toBeUndefined();
  });

  it('should get IBAN format by country code', async () => {
    const de = await getIbanFormat('DE');
    expect(de).toBeDefined();
    expect(de?.country_code).toBe('DE');
    expect(de?.length).toBe(22);

    const invalid = await getIbanFormat('INVALID');
    expect(invalid).toBeUndefined();
  });

  it('should validate currency codes', async () => {
    const usdValid = await isValidCurrency('USD');
    expect(usdValid).toBe(true);

    const eurValid = await isValidCurrency('EUR');
    expect(eurValid).toBe(true);

    const invalidValid = await isValidCurrency('INVALID');
    expect(invalidValid).toBe(false);
  });

  it('should validate country codes', async () => {
    const usValid = await isValidCountry('US');
    expect(usValid).toBe(true);

    const usaValid = await isValidCountry('USA');
    expect(usaValid).toBe(true);

    const invalidValid = await isValidCountry('INVALID');
    expect(invalidValid).toBe(false);
  });
});
