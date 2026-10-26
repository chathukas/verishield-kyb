/**
 * US HHS NPPES (National Plan and Provider Enumeration System) NPI Registry API v2.1
 * Official verification for US healthcare organizations, medical device suppliers, and clinical vendors.
 */

const NPPES_API_URL = 'https://npiregistry.cms.hhs.gov/api/';

export async function verifyNppesNpi({ npiNumber, organizationName, state, timeoutMs = 8000 }) {
  if (!npiNumber && !organizationName) {
    return { checked: false, found: false, reason: 'No npiNumber or organizationName provided' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const params = new URLSearchParams({ version: '2.1', limit: '3' });
    if (npiNumber && /^\d{10}$/.test(String(npiNumber).trim())) {
      params.set('number', String(npiNumber).trim());
    } else if (organizationName) {
      params.set('organization_name', organizationName.trim());
      params.set('enumeration_type', 'NPI-2'); // Organization providers
      if (state && /^[A-Z]{2}$/i.test(state.trim())) {
        params.set('state', state.trim().toUpperCase());
      }
    } else {
      return { checked: false, found: false, reason: 'Invalid NPI format (must be 10 digits)' };
    }

    const res = await fetch(`${NPPES_API_URL}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!res.ok) {
      return { checked: true, found: false, error: `NPPES API returned HTTP ${res.status}` };
    }

    const data = await res.json();
    const results = data.results || [];
    if (results.length === 0) {
      return { checked: true, found: false, resultCount: 0 };
    }

    const top = results[0];
    const basic = top.basic || {};
    const primaryTaxonomy = (top.taxonomies || []).find((t) => t.primary) || top.taxonomies?.[0] || {};
    const locationAddr = (top.addresses || []).find((a) => a.address_purpose === 'LOCATION') || top.addresses?.[0] || {};

    return {
      checked: true,
      found: true,
      resultCount: data.result_count || results.length,
      npi: top.number,
      enumerationType: top.enumeration_type,
      organizationName: basic.organization_name || `${basic.first_name || ''} ${basic.last_name || ''}`.trim(),
      status: basic.status === 'A' ? 'ACTIVE' : basic.status || 'UNKNOWN',
      enumerationDate: basic.enumeration_date || null,
      lastUpdated: basic.last_updated || null,
      authorizedOfficial: basic.authorized_official_last_name
        ? `${basic.authorized_official_first_name || ''} ${basic.authorized_official_last_name}`.trim()
        : null,
      primaryTaxonomy: {
        code: primaryTaxonomy.code || null,
        desc: primaryTaxonomy.desc || null,
        license: primaryTaxonomy.license || null,
        state: primaryTaxonomy.state || null,
      },
      address: {
        address1: locationAddr.address_1 || null,
        city: locationAddr.city || null,
        state: locationAddr.state || null,
        postalCode: locationAddr.postal_code || null,
        countryCode: locationAddr.country_code || null,
        telephone: locationAddr.telephone_number || null,
      },
    };
  } catch (err) {
    return {
      checked: true,
      found: false,
      error: err.name === 'AbortError' ? 'NPPES NPI request timed out' : err.message,
    };
  } finally {
    clearTimeout(timer);
  }
}
