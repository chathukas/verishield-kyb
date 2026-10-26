/**
 * Deterministic 0–100 Vendor KYB, Entity Registry & Regulatory Compliance Scoring Engine
 * Synthesizes GLEIF LEI, EU VIES VAT, US SEC EDGAR, HHS NPPES NPI, and Domain Technical/Regulatory posture.
 */

export function computeVendorComplianceScore({ input, gleif, vies, sec, nppes, domainAudit }) {
  let earnedPoints = 0;
  let maxPossiblePoints = 0;
  const riskFlags = [];
  const passedChecks = [];
  const remediationActions = [];

  // 1. Official Entity Registry Verification (Weight: up to 45 points)
  const anyRegistryChecked = Boolean(gleif?.checked || vies?.checked || sec?.checked || nppes?.checked);
  if (anyRegistryChecked) {
    maxPossiblePoints += 45;
    let registryPoints = 0;

    if (gleif?.checked) {
      if (gleif.found && gleif.entityStatus === 'ACTIVE') {
        registryPoints += 25;
        passedChecks.push(`Verified Active Global LEI (${gleif.lei}) — ${gleif.legalName} [${gleif.jurisdiction}]`);
        if (gleif.registrationStatus === 'LAPSED') {
          riskFlags.push('GLEIF LEI registration renewal status is LAPSED (annual renewal overdue)');
          remediationActions.push('Request vendor to renew their GLEIF Legal Entity Identifier (LEI) registration.');
          registryPoints -= 5;
        }
      } else if (gleif.found) {
        registryPoints += 10;
        riskFlags.push(`GLEIF entity found (${gleif.lei}) but status is ${gleif.entityStatus}`);
      } else if (input.lei) {
        riskFlags.push(`Provided LEI (${input.lei}) was NOT found in the global GLEIF registry`);
      }
    }

    if (vies?.checked) {
      if (vies.valid) {
        registryPoints += 20;
        passedChecks.push(`Validated EU VIES VAT (${vies.fullVat})${vies.traderName ? ` — ${vies.traderName}` : ''}`);
      } else {
        riskFlags.push(`EU VAT number (${vies.fullVat || input.vatNumber}) failed VIES validation: ${vies.reason || vies.error || 'Invalid'}`);
        remediationActions.push('Obtain a valid cross-border EU VAT certificate before applying 0% reverse-charge VAT invoicing.');
      }
    }

    if (sec?.checked && sec.found) {
      registryPoints += 20;
      passedChecks.push(`Verified US SEC EDGAR Registrant (CIK ${sec.cik}) — ${sec.entityName} [${sec.tickers?.join(', ') || 'Filing Entity'}]`);
    }

    if (nppes?.checked && nppes.found) {
      if (nppes.status === 'ACTIVE') {
        registryPoints += 20;
        passedChecks.push(`Verified Active US HHS NPI (${nppes.npi}) — ${nppes.organizationName}`);
      } else {
        riskFlags.push(`NPPES NPI (${nppes.npi}) is not active (status: ${nppes.status})`);
      }
    }

    // If at least one official registry confirmed active legal standing, award strong baseline
    if (registryPoints > 0 && registryPoints < 35 && !vies?.checked && (gleif?.found || sec?.found || nppes?.found)) {
      registryPoints = Math.min(45, registryPoints + 15);
    }

    earnedPoints += Math.max(0, Math.min(45, registryPoints));
  }

  // 2. Domain & Email Anti-Fraud / NIS2 Cyber Hygiene (Weight: up to 35 points)
  if (domainAudit?.checked) {
    maxPossiblePoints += 35;
    const { dns, http } = domainAudit;

    if (dns?.hasMx) {
      earnedPoints += 4;
      passedChecks.push(`Active corporate mail exchange (MX) configured on ${domainAudit.domain}`);
    }

    if (dns?.hasSpf) {
      earnedPoints += 6;
      passedChecks.push(`SPF anti-spoofing record configured (${dns.spfStrictness})`);
    } else {
      riskFlags.push(`Missing SPF DNS record on ${domainAudit.domain} (elevated BEC/email spoofing risk)`);
      remediationActions.push(`Publish a strict SPF TXT record (v=spf1 ... -all) on ${domainAudit.domain}.`);
    }

    if (dns?.hasDmarc) {
      if (dns.dmarcPolicy === 'reject' || dns.dmarcPolicy === 'quarantine') {
        earnedPoints += 8;
        passedChecks.push(`Enforced DMARC anti-phishing policy (p=${dns.dmarcPolicy})`);
      } else {
        earnedPoints += 4;
        riskFlags.push(`DMARC record present on ${domainAudit.domain} but policy is set to p=none (monitoring only)`);
        remediationActions.push('Upgrade DMARC policy from p=none to p=quarantine or p=reject.');
      }
    } else {
      riskFlags.push(`Missing DMARC record (_dmarc.${domainAudit.domain})`);
      remediationActions.push(`Add a _dmarc.${domainAudit.domain} TXT record to prevent domain impersonation.`);
    }

    if (http?.reachable && http?.httpsSupported) {
      earnedPoints += 5;
      passedChecks.push(`HTTPS/TLS encryption verified (${http.finalUrl})`);

      const headerCount = http.securityHeadersPresent?.length || 0;
      const headerScore = Math.min(10, Math.round((headerCount / 5) * 10));
      earnedPoints += headerScore;

      if (headerCount >= 4) {
        passedChecks.push(`Strong HTTP Security Headers posture (Grade ${http.securityHeadersGrade}: ${headerCount}/6 headers present)`);
      } else {
        riskFlags.push(`Weak HTTP Security Headers (Grade ${http.securityHeadersGrade}: missing ${http.securityHeadersMissing?.slice(0, 3).join(', ')})`);
        remediationActions.push(`Configure missing HTTP security headers (${http.securityHeadersMissing?.join(', ')}) for NIS2/ISO 27001 alignment.`);
      }

      if (http.hasSecurityTxt) {
        earnedPoints += 2;
        passedChecks.push('RFC 9116 /.well-known/security.txt vulnerability disclosure policy published');
      }
    } else if (http && !http.reachable) {
      riskFlags.push(`Primary corporate domain https://${domainAudit.domain} was unreachable (${http.error || 'Connection failed'})`);
    }
  }

  // 3. EU GDPR / ePrivacy & EAA (EN 301 549 / WCAG 2.2) Digital Compliance Signals (Weight: up to 20 points)
  if (domainAudit?.http?.htmlSignals?.inspected) {
    maxPossiblePoints += 20;
    const { gdprAndPrivacy, eaaAccessibilitySignals } = domainAudit.http.htmlSignals;

    if (gdprAndPrivacy.hasPrivacyPolicyLink) {
      earnedPoints += 5;
      passedChecks.push('Public Privacy Notice / GDPR Data Protection link detected');
    } else {
      riskFlags.push('No explicit Privacy Policy link detected on homepage HTML');
      remediationActions.push('Ensure a clear Privacy Policy link is visible in the global footer.');
    }

    if (gdprAndPrivacy.hasConsentBannerOrCmp) {
      earnedPoints += 5;
      const cmpLabel = gdprAndPrivacy.detectedCmpProviders.length > 0
        ? gdprAndPrivacy.detectedCmpProviders.join(', ')
        : 'Consent Banner Signal';
      passedChecks.push(`GDPR / ePrivacy Consent Management detected (${cmpLabel})`);
    }

    let eaaPoints = 0;
    if (eaaAccessibilitySignals.hasHtmlLangAttribute) eaaPoints += 3;
    else remediationActions.push('Add a valid lang attribute to the root <html> element (WCAG 3.1.1 / EN 301 549).');

    if (eaaAccessibilitySignals.hasDocumentTitle) eaaPoints += 2;
    if (!eaaAccessibilitySignals.blocksPinchToZoomViolation) eaaPoints += 2;
    else {
      riskFlags.push('Viewport meta tag blocks user pinch-to-zoom (WCAG 1.4.4 / EAA non-compliance risk)');
      remediationActions.push('Remove user-scalable=no and maximum-scale=1.0 restrictions from meta viewport.');
    }

    if (eaaAccessibilitySignals.imageAltCoveragePercent >= 80) {
      eaaPoints += 3;
      passedChecks.push(`EAA / WCAG Baseline HTML signals passed (${eaaAccessibilitySignals.imageAltCoveragePercent}% image alt coverage)`);
    } else {
      riskFlags.push(`Low image alt-text accessibility coverage (${eaaAccessibilitySignals.imageAltCoveragePercent}% across ${eaaAccessibilitySignals.totalImagesSampled} images)`);
      remediationActions.push('Add descriptive alt attributes to all informative <img> elements for EAA (EN 301 549) compliance.');
    }

    earnedPoints += eaaPoints;
  }

  const normalizedScore = maxPossiblePoints > 0
    ? Math.max(0, Math.min(100, Math.round((earnedPoints / maxPossiblePoints) * 100)))
    : 0;

  let grade = 'F';
  let riskLevel = 'HIGH_RISK';
  let decisionRecommendation = 'MANUAL_EDD_REQUIRED';

  if (normalizedScore >= 90) {
    grade = 'A+';
    riskLevel = 'LOW_RISK';
    decisionRecommendation = 'AUTO_APPROVE_ELIGIBLE';
  } else if (normalizedScore >= 80) {
    grade = 'A';
    riskLevel = 'LOW_RISK';
    decisionRecommendation = 'AUTO_APPROVE_ELIGIBLE';
  } else if (normalizedScore >= 70) {
    grade = 'B';
    riskLevel = 'MODERATE_LOW_RISK';
    decisionRecommendation = 'STANDARD_ONBOARDING';
  } else if (normalizedScore >= 55) {
    grade = 'C';
    riskLevel = 'MODERATE_RISK';
    decisionRecommendation = 'REVIEW_FLAGGED_ITEMS';
  } else if (normalizedScore >= 40) {
    grade = 'D';
    riskLevel = 'ELEVATED_RISK';
    decisionRecommendation = 'MANUAL_EDD_REQUIRED';
  }

  return {
    overallScore: normalizedScore,
    complianceGrade: grade,
    riskLevel,
    decisionRecommendation,
    earnedPoints,
    maxPossiblePoints,
    passedChecksCount: passedChecks.length,
    riskFlagsCount: riskFlags.length,
    passedChecks,
    riskFlags,
    remediationActions,
  };
}
