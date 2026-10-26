/**
 * GLEIF (Global Legal Entity Identifier Foundation) Official REST API v1 Connector
 * Queries 3.4M+ official global legal entities across 200+ jurisdictions.
 * Free public API, no API key or residential proxy required.
 */

const GLEIF_API_BASE = 'https://api.gleif.org/api/v1/lei-records';

export async function verifyGleifEntity({ lei, companyName, countryCode, timeoutMs = 8000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let url;
    if (lei && /^[A-Z0-9]{20}$/i.test(lei.trim())) {
      url = `${GLEIF_API_BASE}/${encodeURIComponent(lei.trim().toUpperCase())}`;
    } else if (companyName) {
      const params = new URLSearchParams({
        'filter[entity.legalName]': companyName.trim(),
        'page[size]': '3',
      });
      if (countryCode && /^[A-Z]{2}$/i.test(countryCode.trim())) {
        params.set('filter[entity.legalAddress.country]', countryCode.trim().toUpperCase());
      }
      url = `${GLEIF_API_BASE}?${params.toString()}`;
    } else {
      return {
        checked: false,
        found: false,
        reason: 'No LEI or companyName provided for GLEIF lookup',
      };
    }

    const res = await fetch(url, {
      headers: { Accept: 'application/vnd.api+json' },
      signal: controller.signal,
    });

    if (!res.ok) {
      if (res.status === 404) {
        return { checked: true, found: false, status: 'NOT_FOUND' };
      }
      return {
        checked: true,
        found: false,
        error: `GLEIF API returned HTTP ${res.status}`,
      };
    }

    const payload = await res.json();
    const record = Array.isArray(payload.data) ? payload.data[0] : payload.data;

    if (!record || !record.attributes) {
      return { checked: true, found: false, status: 'NO_MATCHING_ENTITY' };
    }

    const attr = record.attributes;
    const entity = attr.entity || {};
    const reg = attr.registration || {};
    const legalAddr = entity.legalAddress || {};
    const hqAddr = entity.headquartersAddress || {};

    return {
      checked: true,
      found: true,
      lei: attr.lei || record.id,
      legalName: entity.legalName?.name || null,
      legalNameLanguage: entity.legalName?.language || null,
      entityStatus: entity.status || null, // e.g., ACTIVE, INACTIVE
      registrationStatus: reg.status || null, // e.g., ISSUED, LAPSED, RETIRED
      jurisdiction: entity.jurisdiction || legalAddr.country || null,
      category: entity.category || null,
      legalFormCode: entity.legalForm?.id || null,
      registeredAtAuthority: entity.registeredAt?.id || null,
      registrationNumber: entity.registeredAs || null,
      initialRegistrationDate: reg.initialRegistrationDate || null,
      lastUpdateDate: reg.lastUpdateDate || null,
      nextRenewalDate: reg.nextRenewalDate || null,
      managingLou: reg.managingLou || null,
      bicCodes: Array.isArray(attr.bic) ? attr.bic : [],
      micCodes: Array.isArray(attr.mic) ? attr.mic : [],
      legalAddress: {
        addressLines: legalAddr.addressLines || [],
        city: legalAddr.city || null,
        region: legalAddr.region || null,
        country: legalAddr.country || null,
        postalCode: legalAddr.postalCode || null,
      },
      headquartersAddress: {
        addressLines: hqAddr.addressLines || [],
        city: hqAddr.city || null,
        region: hqAddr.region || null,
        country: hqAddr.country || null,
        postalCode: hqAddr.postalCode || null,
      },
      totalMatches: payload.meta?.pagination?.total || 1,
    };
  } catch (err) {
    return {
      checked: true,
      found: false,
      error: err.name === 'AbortError' ? 'GLEIF API request timed out' : err.message,
    };
  } finally {
    clearTimeout(timer);
  }
}
