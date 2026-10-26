/**
 * US SEC EDGAR Official API Connector
 * Verifies US public companies, CIK numbers, SIC classifications, state of incorporation,
 * and recent regulatory filings (10-K, 10-Q, 8-K) directly via data.sec.gov.
 */

const SEC_SUBMISSIONS_BASE = 'https://data.sec.gov/submissions';
const SEC_TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json';
const SEC_USER_AGENT = 'VeriShieldKYBComplianceEngine/1.0 (compliance-verification@verishield.io)';

let cachedTickers = null;

async function resolveCikFromTickerOrName(query, timeoutMs = 8000) {
  if (!query) return null;
  const cleaned = query.trim();
  if (/^\d{1,10}$/.test(cleaned)) {
    return cleaned.padStart(10, '0');
  }

  if (!cachedTickers) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(SEC_TICKERS_URL, {
        headers: { 'User-Agent': SEC_USER_AGENT, Accept: 'application/json' },
        signal: controller.signal,
      });
      if (res.ok) {
        cachedTickers = await res.json();
      }
    } catch {
      // Ignore cache load error
    } finally {
      clearTimeout(timer);
    }
  }

  if (!cachedTickers) return null;
  const upper = cleaned.toUpperCase();
  const entries = Object.values(cachedTickers);

  // 1. Exact ticker match
  const exactTicker = entries.find((e) => e.ticker === upper);
  if (exactTicker) return String(exactTicker.cik_str).padStart(10, '0');

  // 2. Exact or prefix title match
  const normalizedQuery = upper.replace(/[,.\s]+(INC|CORP|CORPORATION|LLC|LTD|PLC|CO)\.?$/i, '').trim();
  const titleMatch = entries.find((e) => {
    const t = String(e.title || '').toUpperCase();
    return t === upper || t.startsWith(normalizedQuery);
  });
  if (titleMatch) return String(titleMatch.cik_str).padStart(10, '0');

  return null;
}

export async function verifySecEdgar({ cik, ticker, companyName, timeoutMs = 8000 }) {
  const query = cik || ticker || companyName;
  if (!query) {
    return { checked: false, found: false, reason: 'No CIK, ticker, or companyName provided' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resolvedCik = await resolveCikFromTickerOrName(cik || ticker || companyName, timeoutMs);
    if (!resolvedCik) {
      return {
        checked: true,
        found: false,
        status: 'NOT_PUBLICLY_LISTED_US_SEC',
      };
    }

    const url = `${SEC_SUBMISSIONS_BASE}/CIK${resolvedCik}.json`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': SEC_USER_AGENT,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      return {
        checked: true,
        found: false,
        cik: resolvedCik,
        error: `SEC EDGAR API returned HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    const recent = data.filings?.recent || {};
    const recentForms = [];
    if (Array.isArray(recent.form)) {
      for (let i = 0; i < Math.min(recent.form.length, 25); i++) {
        const formType = recent.form[i];
        if (['10-K', '10-Q', '8-K', '20-F', '40-F', 'DEF 14A'].includes(formType) && recentForms.length < 5) {
          recentForms.push({
            form: formType,
            filingDate: recent.filingDate?.[i] || null,
            accessionNumber: recent.accessionNumber?.[i] || null,
          });
        }
      }
    }

    return {
      checked: true,
      found: true,
      cik: resolvedCik,
      entityName: data.name || null,
      tickers: data.tickers || [],
      exchanges: data.exchanges || [],
      sic: data.sic || null,
      sicDescription: data.sicDescription || null,
      stateOfIncorporation: data.stateOfIncorporation || null,
      ein: data.ein || null,
      fiscalYearEnd: data.fiscalYearEnd || null,
      category: data.category || null,
      recentKeyFilings: recentForms,
    };
  } catch (err) {
    return {
      checked: true,
      found: false,
      error: err.name === 'AbortError' ? 'SEC EDGAR request timed out' : err.message,
    };
  } finally {
    clearTimeout(timer);
  }
}
