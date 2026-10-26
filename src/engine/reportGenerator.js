/**
 * Generates a self-contained, print/PDF-ready White-Label Executive KYB & Regulatory Compliance Certificate (HTML).
 * Agencies, compliance officers, and procurement teams can archive or send this report directly to stakeholders.
 */

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function generateExecutiveHtmlReport(record, brandConfig = {}) {
  const brandName = brandConfig.brandName || 'VeriShield KYB & Compliance Intelligence';
  const brandSubtitle = brandConfig.brandSubtitle || 'Automated Multi-Registry KYB, Tax & NIS2/EAA Technical Compliance Audit';
  const score = record.complianceSummary?.overallScore ?? 0;
  const grade = record.complianceSummary?.complianceGrade || 'N/A';
  const riskLevel = record.complianceSummary?.riskLevel || 'UNKNOWN';
  const badgeColor =
    score >= 80 ? '#059669' : score >= 65 ? '#d97706' : '#dc2626';

  const gleif = record.registries?.gleif || {};
  const vies = record.registries?.vies || {};
  const sec = record.registries?.sec || {};
  const nppes = record.registries?.nppes || {};
  const dom = record.domainAudit || {};

  const passedList = (record.complianceSummary?.passedChecks || [])
    .map((item) => `<li class="pass-item">✓ ${escapeHtml(item)}</li>`)
    .join('');

  const riskList = (record.complianceSummary?.riskFlags || [])
    .map((item) => `<li class="risk-item">⚠ ${escapeHtml(item)}</li>`)
    .join('');

  const remediationList = (record.complianceSummary?.remediationActions || [])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>KYB & Compliance Audit Certificate — ${escapeHtml(record.vendorName || record.domain || 'Vendor')}</title>
  <style>
    :root {
      --primary: #0f172a;
      --accent: #2563eb;
      --badge: ${badgeColor};
      --border: #e2e8f0;
      --bg: #f8fafc;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: var(--bg);
      margin: 0;
      padding: 32px 16px;
      line-height: 1.5;
    }
    .sheet {
      max-width: 920px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 10px 25px rgba(15, 23, 42, 0.06);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid var(--primary);
      padding-bottom: 24px;
      margin-bottom: 28px;
      gap: 20px;
    }
    .brand-title {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent);
      font-weight: 700;
      margin-bottom: 4px;
    }
    h1 {
      font-size: 26px;
      margin: 0 0 6px 0;
      color: var(--primary);
    }
    .subtitle {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }
    .score-card {
      text-align: right;
      min-width: 170px;
      background: #f1f5f9;
      padding: 14px 20px;
      border-radius: 10px;
      border-left: 5px solid var(--badge);
    }
    .score-num {
      font-size: 32px;
      font-weight: 800;
      color: var(--badge);
      line-height: 1.1;
    }
    .score-meta {
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      margin-top: 4px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .card {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      background: #fff;
    }
    .card h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #475569;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 6px;
    }
    .kv {
      font-size: 13px;
      margin: 5px 0;
    }
    .kv strong {
      color: #0f172a;
    }
    ul.findings {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    ul.findings li {
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 6px;
      font-size: 13.5px;
    }
    .pass-item {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .risk-item {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
      font-size: 11.5px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { box-shadow: none; border: none; padding: 16px; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <div class="brand-title">${escapeHtml(brandName)}</div>
        <h1>${escapeHtml(record.vendorName || gleif.legalName || sec.entityName || record.domain || 'Vendor Compliance Audit')}</h1>
        <p class="subtitle">${escapeHtml(brandSubtitle)} • Audit ID: <code>${escapeHtml(record.auditId)}</code></p>
      </div>
      <div class="score-card">
        <div class="score-num">${score}/100 (${escapeHtml(grade)})</div>
        <div class="score-meta">${escapeHtml(riskLevel)} • ${escapeHtml(record.complianceSummary?.decisionRecommendation)}</div>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <h3>1. Global Legal Entity (GLEIF LEI)</h3>
        <div class="kv"><strong>Status:</strong> ${gleif.found ? escapeHtml(`${gleif.entityStatus} (${gleif.registrationStatus})`) : 'Not Found / Not Checked'}</div>
        <div class="kv"><strong>LEI Code:</strong> <code>${escapeHtml(gleif.lei || '—')}</code></div>
        <div class="kv"><strong>Legal Name:</strong> ${escapeHtml(gleif.legalName || '—')}</div>
        <div class="kv"><strong>Jurisdiction:</strong> ${escapeHtml(gleif.jurisdiction || '—')} (${escapeHtml(gleif.registrationNumber || '—')})</div>
        <div class="kv"><strong>HQ City:</strong> ${escapeHtml(gleif.headquartersAddress?.city || '—')}, ${escapeHtml(gleif.headquartersAddress?.country || '—')}</div>
      </div>

      <div class="card">
        <h3>2. Tax & Financial Registries (VIES / SEC / NPI)</h3>
        <div class="kv"><strong>EU VIES VAT:</strong> ${vies.checked ? (vies.valid ? `VALID (${escapeHtml(vies.fullVat)})` : `INVALID (${escapeHtml(vies.fullVat || '')})`) : 'Not Checked'}</div>
        <div class="kv"><strong>VIES Trader:</strong> ${escapeHtml(vies.traderName || '—')}</div>
        <div class="kv"><strong>US SEC EDGAR:</strong> ${sec.found ? `Verified CIK ${escapeHtml(sec.cik)} (${escapeHtml((sec.tickers || []).join(', '))})` : 'Not Listed / Not Checked'}</div>
        <div class="kv"><strong>SEC SIC Industry:</strong> ${escapeHtml(sec.sicDescription || '—')}</div>
        <div class="kv"><strong>US HHS NPI:</strong> ${nppes.found ? `${escapeHtml(nppes.npi)} (${escapeHtml(nppes.status)})` : 'Not Checked'}</div>
      </div>

      <div class="card">
        <h3>3. Cyber, Email & EU EAA/GDPR Signals</h3>
        <div class="kv"><strong>Domain:</strong> <code>${escapeHtml(dom.domain || '—')}</code></div>
        <div class="kv"><strong>Email Anti-Spoofing:</strong> SPF: ${dom.dns?.hasSpf ? 'PASS' : 'MISSING'} | DMARC: ${dom.dns?.hasDmarc ? `PASS (p=${escapeHtml(dom.dns.dmarcPolicy)})` : 'MISSING'}</div>
        <div class="kv"><strong>NIS2 HTTP Headers Grade:</strong> <strong>${escapeHtml(dom.http?.securityHeadersGrade || '—')}</strong> (${(dom.http?.securityHeadersPresent || []).length}/6 present)</div>
        <div class="kv"><strong>GDPR Privacy & CMP:</strong> Privacy Link: ${dom.http?.htmlSignals?.gdprAndPrivacy?.hasPrivacyPolicyLink ? 'Yes' : 'No'} | CMP: ${escapeHtml((dom.http?.htmlSignals?.gdprAndPrivacy?.detectedCmpProviders || []).join(', ') || 'None detected')}</div>
        <div class="kv"><strong>EAA WCAG Img Alt Coverage:</strong> ${dom.http?.htmlSignals?.eaaAccessibilitySignals?.imageAltCoveragePercent ?? '—'}%</div>
      </div>
    </div>

    <h3>Verified Compliance Controls & Passed Checks (${record.complianceSummary?.passedChecksCount || 0})</h3>
    <ul class="findings">
      ${passedList || '<li class="kv">No automated checks passed.</li>'}
    </ul>

    ${
      riskList
        ? `<h3 style="margin-top:24px;">Identified Risk Flags & Exceptions (${record.complianceSummary?.riskFlagsCount || 0})</h3>
           <ul class="findings">${riskList}</ul>`
        : ''
    }

    ${
      remediationList
        ? `<h3 style="margin-top:24px;">Recommended Remediation Actions</h3>
           <ul>${remediationList}</ul>`
        : ''
    }

    <div class="footer">
      <span>Generated automatically by ${escapeHtml(brandName)}</span>
      <span>Timestamp (UTC): ${escapeHtml(record.auditedAt)}</span>
    </div>
  </div>
</body>
</html>`;
}
