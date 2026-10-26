/**
 * Live Domain Technical Hygiene, Email Anti-Spoofing (SPF/DMARC/MX),
 * NIS2 Security Headers, RFC 9116 security.txt, and EU GDPR / EAA Web Compliance Auditor.
 */

import dns from 'node:dns/promises';

function normalizeDomain(input) {
  if (!input || typeof input !== 'string') return null;
  let cleaned = input.trim().toLowerCase();
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }
  try {
    const parsed = new URL(cleaned);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

async function checkDnsRecords(domain) {
  const result = {
    hasMx: false,
    mxRecords: [],
    hasSpf: false,
    spfRecord: null,
    spfStrictness: 'NONE',
    hasDmarc: false,
    dmarcRecord: null,
    dmarcPolicy: 'NONE',
  };

  try {
    const mx = await dns.resolveMx(domain);
    if (Array.isArray(mx) && mx.length > 0) {
      result.hasMx = true;
      result.mxRecords = mx
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 5)
        .map((r) => r.exchange);
    }
  } catch {
    // MX not present or unreachable
  }

  try {
    const txtChunks = await dns.resolveTxt(domain);
    const flatTxt = txtChunks.map((chunks) => chunks.join(''));
    const spf = flatTxt.find((t) => t.toLowerCase().startsWith('v=spf1'));
    if (spf) {
      result.hasSpf = true;
      result.spfRecord = spf;
      if (spf.includes('-all')) result.spfStrictness = 'HARD_FAIL (-all)';
      else if (spf.includes('~all')) result.spfStrictness = 'SOFT_FAIL (~all)';
      else result.spfStrictness = 'PERMISSIVE';
    }
  } catch {
    // TXT not present
  }

  try {
    const dmarcChunks = await dns.resolveTxt(`_dmarc.${domain}`);
    const flatDmarc = dmarcChunks.map((chunks) => chunks.join(''));
    const dmarc = flatDmarc.find((t) => t.toLowerCase().startsWith('v=dmarc1'));
    if (dmarc) {
      result.hasDmarc = true;
      result.dmarcRecord = dmarc;
      const policyMatch = dmarc.match(/;\s*p=([a-zA-Z]+)/i) || dmarc.match(/^v=DMARC1;\s*p=([a-zA-Z]+)/i);
      result.dmarcPolicy = policyMatch ? policyMatch[1].toLowerCase() : 'unknown';
    }
  } catch {
    // DMARC not present
  }

  return result;
}

function inspectHtmlComplianceSignals(html) {
  if (!html || typeof html !== 'string') {
    return {
      inspected: false,
    };
  }

  const lower = html.toLowerCase();

  // 1. GDPR / Consent Management Platform (CMP) & Privacy Signals
  const cmpProviders = [];
  if (lower.includes('onetrust') || lower.includes('optanon')) cmpProviders.push('OneTrust');
  if (lower.includes('cookiebot')) cmpProviders.push('Cookiebot');
  if (lower.includes('usercentrics')) cmpProviders.push('Usercentrics');
  if (lower.includes('trustarc')) cmpProviders.push('TrustArc');
  if (lower.includes('osano')) cmpProviders.push('Osano');
  if (lower.includes('didomi')) cmpProviders.push('Didomi');
  if (lower.includes('iubenda')) cmpProviders.push('iubenda');
  if (lower.includes('complianz')) cmpProviders.push('Complianz');
  if (lower.includes('cookieyes')) cmpProviders.push('CookieYes');
  if (lower.includes('gtag("consent"') || lower.includes("gtag('consent'") || lower.includes('consent_mode')) {
    cmpProviders.push('Google Consent Mode');
  }

  const hasPrivacyPolicyLink =
    /href=["'][^"']*(privacy|datenschutz|confidentialite|privacidad)[^"']*["']/i.test(html) ||
    lower.includes('privacy policy') ||
    lower.includes('privacy notice');

  const hasTermsLink =
    /href=["'][^"']*(terms|legal|impressum|imprint)[^"']*["']/i.test(html);

  // 2. EU EAA (EN 301 549 / WCAG 2.2 AA) Static Baseline Signals
  const hasHtmlLang = /<html[^>]+lang=["'][a-zA-Z-]+["']/i.test(html);
  const hasTitle = /<title>[^<]+<\/title>/i.test(html);
  const hasViewportMeta = /<meta[^>]+name=["']viewport["']/i.test(html);
  const userScalableBlocked = /user-scalable\s*=\s*(no|0)/i.test(html) || /maximum-scale\s*=\s*1(\.0)?([^\d]|$)/i.test(html);
  const hasMainLandmark = /<main[\s>]/i.test(html) || /role=["']main["']/i.test(html);
  const hasSkipLink = /href=["']#(main|content|skip|main-content)["']/i.test(html);

  const imgTags = html.match(/<img\b[^>]*>/gi) || [];
  const imgsWithAlt = imgTags.filter((tag) => /\balt\s*=/i.test(tag));
  const imgAltCoveragePct = imgTags.length > 0 ? Math.round((imgsWithAlt.length / imgTags.length) * 100) : 100;

  return {
    inspected: true,
    gdprAndPrivacy: {
      detectedCmpProviders: cmpProviders,
      hasConsentBannerOrCmp: cmpProviders.length > 0 || lower.includes('cookie-consent') || lower.includes('cookiebanner'),
      hasPrivacyPolicyLink,
      hasTermsOrLegalLink: hasTermsLink,
    },
    eaaAccessibilitySignals: {
      hasHtmlLangAttribute: hasHtmlLang,
      hasDocumentTitle: hasTitle,
      hasResponsiveViewport: hasViewportMeta,
      blocksPinchToZoomViolation: userScalableBlocked,
      hasMainLandmark,
      hasSkipToContentLink: hasSkipLink,
      totalImagesSampled: imgTags.length,
      imageAltCoveragePercent: imgAltCoveragePct,
    },
  };
}

export async function auditVendorDomain({ domain: rawDomain, timeoutMs = 8000 }) {
  const domain = normalizeDomain(rawDomain);
  if (!domain) {
    return { checked: false, reason: 'No valid domain provided' };
  }

  const dnsPromise = checkDnsRecords(domain);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let httpResult = {
    reachable: false,
    httpsSupported: false,
    statusCode: null,
    finalUrl: null,
    headers: {},
    securityHeadersGrade: 'F',
    securityHeadersPresent: [],
    securityHeadersMissing: [],
    hasSecurityTxt: false,
    hasLlmsTxt: false,
    htmlSignals: { inspected: false },
  };

  try {
    const targetUrl = `https://${domain}`;
    const res = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VeriShieldComplianceAuditor/1.0; +https://verishield.io)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });

    const headersObj = {};
    res.headers.forEach((v, k) => {
      headersObj[k.toLowerCase()] = v;
    });

    const requiredHeaders = [
      { key: 'strict-transport-security', label: 'HSTS (Strict-Transport-Security)' },
      { key: 'content-security-policy', label: 'CSP (Content-Security-Policy)' },
      { key: 'x-frame-options', label: 'X-Frame-Options' },
      { key: 'x-content-type-options', label: 'X-Content-Type-Options' },
      { key: 'referrer-policy', label: 'Referrer-Policy' },
      { key: 'permissions-policy', label: 'Permissions-Policy' },
    ];

    const present = [];
    const missing = [];

    for (const h of requiredHeaders) {
      if (headersObj[h.key]) {
        present.push(h.label);
      } else {
        missing.push(h.label);
      }
    }

    let secGrade = 'F';
    if (present.length >= 5) secGrade = 'A+';
    else if (present.length === 4) secGrade = 'A';
    else if (present.length === 3) secGrade = 'B';
    else if (present.length === 2) secGrade = 'C';
    else if (present.length === 1) secGrade = 'D';

    const htmlText = await res.text();
    const htmlSignals = inspectHtmlComplianceSignals(htmlText.slice(0, 250000));

    // Check RFC 9116 /.well-known/security.txt & /llms.txt in parallel with short timeout
    const [secTxtRes, llmsRes] = await Promise.allSettled([
      fetch(`https://${domain}/.well-known/security.txt`, { method: 'HEAD', signal: controller.signal }),
      fetch(`https://${domain}/llms.txt`, { method: 'HEAD', signal: controller.signal }),
    ]);

    httpResult = {
      reachable: true,
      httpsSupported: res.url.startsWith('https://'),
      statusCode: res.status,
      finalUrl: res.url,
      serverHeader: headersObj['server'] || null,
      securityHeadersGrade: secGrade,
      securityHeadersPresent: present,
      securityHeadersMissing: missing,
      rawSecurityHeaders: {
        strictTransportSecurity: headersObj['strict-transport-security'] || null,
        contentSecurityPolicy: headersObj['content-security-policy'] ? 'PRESENT' : null,
        xFrameOptions: headersObj['x-frame-options'] || null,
        xContentTypeOptions: headersObj['x-content-type-options'] || null,
        referrerPolicy: headersObj['referrer-policy'] || null,
        permissionsPolicy: headersObj['permissions-policy'] || null,
      },
      hasSecurityTxt: secTxtRes.status === 'fulfilled' && secTxtRes.value.ok,
      hasLlmsTxt: llmsRes.status === 'fulfilled' && llmsRes.value.ok,
      htmlSignals,
    };
  } catch (err) {
    httpResult.error = err.name === 'AbortError' ? 'HTTPS audit timed out' : err.message;
  } finally {
    clearTimeout(timer);
  }

  const dnsResult = await dnsPromise;

  return {
    checked: true,
    domain,
    dns: dnsResult,
    http: httpResult,
  };
}
