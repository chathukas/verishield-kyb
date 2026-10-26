/**
 * European Commission VIES (VAT Information Exchange System) Official REST API Connector
 * Validates EU/Northern Ireland cross-border VAT numbers in real time.
 */

const VIES_REST_URL = 'https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number';

const EU_VAT_REGEX = {
  AT: /^ATU\d{8}$/,
  BE: /^BE[01]\d{9}$/,
  BG: /^BG\d{9,10}$/,
  CY: /^CY\d{8}[A-Z]$/,
  CZ: /^CZ\d{8,10}$/,
  DE: /^DE\d{9}$/,
  DK: /^DK\d{8}$/,
  EE: /^EE\d{9}$/,
  EL: /^EL\d{9}$/,
  ES: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/,
  FI: /^FI\d{8}$/,
  FR: /^FR[A-Z0-9]{2}\d{9}$/,
  HR: /^HR\d{11}$/,
  HU: /^HU\d{8}$/,
  IE: /^IE(\d{7}[A-Z]{1,2}|\d[A-Z+*]\d{5}[A-Z])$/,
  IT: /^IT\d{11}$/,
  LT: /^LT(\d{9}|\d{12})$/,
  LU: /^LU\d{8}$/,
  LV: /^LV\d{11}$/,
  MT: /^MT\d{8}$/,
  NL: /^NL\d{9}B\d{2}$/,
  PL: /^PL\d{10}$/,
  PT: /^PT\d{9}$/,
  RO: /^RO\d{2,10}$/,
  SE: /^SE\d{12}$/,
  SI: /^SI\d{8}$/,
  SK: /^SK\d{10}$/,
  XI: /^XI(\d{9}|\d{12}|GD\d{3}|HA\d{3})$/,
};

export function normalizeVatNumber(rawVat) {
  if (!rawVat || typeof rawVat !== 'string') return null;
  const cleaned = rawVat.replace(/[\s.\-/]/g, '').toUpperCase();
  if (cleaned.length < 4) return null;
  let countryCode = cleaned.slice(0, 2);
  if (countryCode === 'GR') countryCode = 'EL';
  const vatNumber = cleaned.slice(2);
  const full = `${countryCode}${vatNumber}`;
  const pattern = EU_VAT_REGEX[countryCode];
  const syntaxValid = pattern ? pattern.test(full) : /^[A-Z]{2}[A-Z0-9]{4,14}$/.test(full);

  return {
    countryCode,
    vatNumber,
    fullVat: full,
    syntaxValid,
    supportedEuMember: Boolean(pattern),
  };
}

export async function verifyEuVat({ vatNumber: rawVat, timeoutMs = 8000 }) {
  if (!rawVat) {
    return { checked: false, valid: false, reason: 'No VAT number provided' };
  }

  const parsed = normalizeVatNumber(rawVat);
  if (!parsed) {
    return {
      checked: true,
      valid: false,
      syntaxValid: false,
      reason: 'Malformed VAT string',
    };
  }

  if (!parsed.supportedEuMember || !parsed.syntaxValid) {
    return {
      checked: true,
      valid: false,
      countryCode: parsed.countryCode,
      vatNumber: parsed.vatNumber,
      fullVat: parsed.fullVat,
      syntaxValid: parsed.syntaxValid,
      supportedEuMember: parsed.supportedEuMember,
      reason: !parsed.supportedEuMember
        ? `Country prefix ${parsed.countryCode} is not an EU/VIES member state`
        : `VAT number ${parsed.fullVat} failed checksum/format validation for ${parsed.countryCode}`,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(VIES_REST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        countryCode: parsed.countryCode,
        vatNumber: parsed.vatNumber,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return {
        checked: true,
        valid: false,
        countryCode: parsed.countryCode,
        vatNumber: parsed.vatNumber,
        fullVat: parsed.fullVat,
        syntaxValid: true,
        error: `VIES API returned HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    return {
      checked: true,
      valid: Boolean(data.valid),
      countryCode: data.countryCode || parsed.countryCode,
      vatNumber: data.vatNumber || parsed.vatNumber,
      fullVat: parsed.fullVat,
      syntaxValid: true,
      requestDate: data.requestDate || new Date().toISOString(),
      traderName: data.name && data.name !== '---' ? data.name.trim() : null,
      traderAddress: data.address && data.address !== '---' ? data.address.trim() : null,
      viesStatus: data.userError || 'SUCCEEDED',
    };
  } catch (err) {
    return {
      checked: true,
      valid: false,
      countryCode: parsed.countryCode,
      vatNumber: parsed.vatNumber,
      fullVat: parsed.fullVat,
      syntaxValid: true,
      error: err.name === 'AbortError' ? 'VIES API request timed out' : err.message,
    };
  } finally {
    clearTimeout(timer);
  }
}
