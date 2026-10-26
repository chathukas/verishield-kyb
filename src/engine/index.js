/**
 * Unified Orchestrator for VeriShield KYB & Regulatory Compliance Engine
 * Executes multi-registry verification and domain compliance audits concurrently.
 */

import crypto from 'node:crypto';
import { verifyGleifEntity } from './gleif.js';
import { verifyEuVat } from './vies.js';
import { verifySecEdgar } from './sec.js';
import { verifyNppesNpi } from './nppes.js';
import { auditVendorDomain } from './domainAudit.js';
import { computeVendorComplianceScore } from './scorer.js';
import { generateExecutiveHtmlReport } from './reportGenerator.js';

export async function verifySingleVendor(vendorInput = {}, options = {}) {
  const startMs = Date.now();
  const {
    companyName = null,
    domain = null,
    lei = null,
    vatNumber = null,
    cik = null,
    ticker = null,
    npiNumber = null,
    countryCode = null,
    state = null,
  } = vendorInput;

  const {
    enableGleif = true,
    enableVies = true,
    enableSec = true,
    enableNppes = false,
    enableDomainAudit = true,
    generateHtmlReport = true,
    brandConfig = {},
    timeoutMs = 8000,
  } = options;

  const tasks = {
    gleif:
      enableGleif && (lei || companyName)
        ? verifyGleifEntity({ lei, companyName, countryCode, timeoutMs })
        : Promise.resolve({ checked: false, found: false }),
    vies:
      enableVies && vatNumber
        ? verifyEuVat({ vatNumber, timeoutMs })
        : Promise.resolve({ checked: false, valid: false }),
    sec:
      enableSec && (cik || ticker || companyName)
        ? verifySecEdgar({ cik, ticker, companyName, timeoutMs })
        : Promise.resolve({ checked: false, found: false }),
    nppes:
      (enableNppes || npiNumber) && (npiNumber || companyName)
        ? verifyNppesNpi({ npiNumber, organizationName: companyName, state, timeoutMs })
        : Promise.resolve({ checked: false, found: false }),
    domainAudit:
      enableDomainAudit && domain
        ? auditVendorDomain({ domain, timeoutMs })
        : Promise.resolve({ checked: false }),
  };

  const [gleif, vies, sec, nppes, domainAudit] = await Promise.all([
    tasks.gleif,
    tasks.vies,
    tasks.sec,
    tasks.nppes,
    tasks.domainAudit,
  ]);

  const complianceSummary = computeVendorComplianceScore({
    input: vendorInput,
    gleif,
    vies,
    sec,
    nppes,
    domainAudit,
  });

  const resolvedVendorName =
    companyName ||
    gleif?.legalName ||
    vies?.traderName ||
    sec?.entityName ||
    nppes?.organizationName ||
    domain ||
    'Unknown Vendor';

  const auditId = `VS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const auditedAt = new Date().toISOString();

  const record = {
    auditId,
    auditedAt,
    durationMs: Date.now() - startMs,
    vendorName: resolvedVendorName,
    domain: domainAudit?.domain || domain || null,
    overallScore: complianceSummary.overallScore,
    complianceGrade: complianceSummary.complianceGrade,
    riskLevel: complianceSummary.riskLevel,
    decisionRecommendation: complianceSummary.decisionRecommendation,
    lei: gleif?.lei || lei || null,
    leiStatus: gleif?.entityStatus || null,
    vatNumber: vies?.fullVat || vatNumber || null,
    vatValid: vies?.checked ? Boolean(vies.valid) : null,
    secCik: sec?.cik || null,
    securityHeadersGrade: domainAudit?.http?.securityHeadersGrade || null,
    spfConfigured: domainAudit?.dns?.hasSpf ?? null,
    dmarcPolicy: domainAudit?.dns?.dmarcPolicy || null,
    complianceSummary,
    registries: {
      gleif,
      vies,
      sec,
      nppes,
    },
    domainAudit,
  };

  if (generateHtmlReport) {
    record.executiveHtmlReport = generateExecutiveHtmlReport(record, brandConfig);
  }

  return record;
}
