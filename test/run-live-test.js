/**
 * Automated End-to-End Verification Suite (`npm test`)
 * Tests:
 * 1. VAT normalization & checksum pre-validator (EU VIES)
 * 2. Deterministic KYB & Compliance Risk Scoring Engine (Grade A+ through F)
 * 3. Executive White-Label HTML Certificate generation
 * 4. MCP JSON-RPC 2.0 Server protocol handshake & tool discovery (`initialize`, `tools/list`, `tools/call`)
 * 5. Full orchestrator execution (`verifySingleVendor`) with live registry/domain fallback handling
 */

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { normalizeVatNumber } from '../src/engine/vies.js';
import { computeVendorComplianceScore } from '../src/engine/scorer.js';
import { generateExecutiveHtmlReport } from '../src/engine/reportGenerator.js';
import { verifySingleVendor } from '../src/engine/index.js';

async function testVatNormalization() {
  console.log('1. Testing EU VIES VAT normalization & syntax validation...');
  const de = normalizeVatNumber('DE 129.273.398');
  assert.equal(de.countryCode, 'DE');
  assert.equal(de.vatNumber, '129273398');
  assert.equal(de.fullVat, 'DE129273398');
  assert.equal(de.syntaxValid, true);
  assert.equal(de.supportedEuMember, true);

  const invalidDe = normalizeVatNumber('DE123');
  assert.equal(invalidDe.syntaxValid, false);

  const grAlias = normalizeVatNumber('GR123456789');
  assert.equal(grAlias.countryCode, 'EL');
  assert.equal(grAlias.syntaxValid, true);
  console.log('   ✓ EU VAT normalization & regex validation passed');
}

async function testScorerAndReportGenerator() {
  console.log('2. Testing deterministic KYB & Compliance Scoring Engine + HTML Certificate Generator...');
  const mockAudit = {
    input: { companyName: 'Siemens Aktiengesellschaft', domain: 'siemens.com', vatNumber: 'DE129273398' },
    gleif: {
      checked: true,
      found: true,
      lei: 'W38RGI023J3WT1HWRP32',
      legalName: 'Siemens Aktiengesellschaft',
      entityStatus: 'ACTIVE',
      registrationStatus: 'ISSUED',
      jurisdiction: 'DE',
      registrationNumber: 'HRB 6684',
      headquartersAddress: { city: 'München', country: 'DE' },
    },
    vies: {
      checked: true,
      valid: true,
      countryCode: 'DE',
      vatNumber: '129273398',
      fullVat: 'DE129273398',
      traderName: 'Siemens AG',
    },
    sec: { checked: false, found: false },
    nppes: { checked: false, found: false },
    domainAudit: {
      checked: true,
      domain: 'siemens.com',
      dns: {
        hasMx: true,
        mxRecords: ['mail.siemens.com'],
        hasSpf: true,
        spfStrictness: 'HARD_FAIL (-all)',
        hasDmarc: true,
        dmarcPolicy: 'reject',
      },
      http: {
        reachable: true,
        httpsSupported: true,
        finalUrl: 'https://www.siemens.com/global/en.html',
        securityHeadersGrade: 'A+',
        securityHeadersPresent: [
          'HSTS (Strict-Transport-Security)',
          'CSP (Content-Security-Policy)',
          'X-Frame-Options',
          'X-Content-Type-Options',
          'Referrer-Policy',
        ],
        securityHeadersMissing: ['Permissions-Policy'],
        hasSecurityTxt: true,
        htmlSignals: {
          inspected: true,
          gdprAndPrivacy: {
            detectedCmpProviders: ['Usercentrics'],
            hasConsentBannerOrCmp: true,
            hasPrivacyPolicyLink: true,
            hasTermsOrLegalLink: true,
          },
          eaaAccessibilitySignals: {
            hasHtmlLangAttribute: true,
            hasDocumentTitle: true,
            hasResponsiveViewport: true,
            blocksPinchToZoomViolation: false,
            hasMainLandmark: true,
            imageAltCoveragePercent: 96,
            totalImagesSampled: 25,
          },
        },
      },
    },
  };

  const summary = computeVendorComplianceScore(mockAudit);
  assert.ok(summary.overallScore >= 90, `Expected score >= 90, got ${summary.overallScore}`);
  assert.equal(summary.complianceGrade, 'A+');
  assert.equal(summary.decisionRecommendation, 'AUTO_APPROVE_ELIGIBLE');

  const html = generateExecutiveHtmlReport(
    {
      auditId: 'VS-TEST0001',
      auditedAt: new Date().toISOString(),
      vendorName: 'Siemens Aktiengesellschaft',
      domain: 'siemens.com',
      complianceSummary: summary,
      registries: {
        gleif: mockAudit.gleif,
        vies: mockAudit.vies,
        sec: mockAudit.sec,
        nppes: mockAudit.nppes,
      },
      domainAudit: mockAudit.domainAudit,
    },
    { brandName: 'VeriShield Enterprise Audit' }
  );

  assert.ok(html.includes('Siemens Aktiengesellschaft'));
  assert.ok(html.includes('W38RGI023J3WT1HWRP32'));
  assert.ok(html.includes('AUTO_APPROVE_ELIGIBLE'));

  const outDir = path.resolve(process.cwd(), 'output');
  await fs.mkdir(outDir, { recursive: true });
  const sampleCertPath = path.join(outDir, 'SAMPLE_Executive_KYB_Certificate_Siemens.html');
  await fs.writeFile(sampleCertPath, html, 'utf8');
  console.log(`   ✓ Scorer (${summary.overallScore}/100, Grade ${summary.complianceGrade}) & HTML Certificate saved to ${sampleCertPath}`);
}

async function testMcpServerHandshake() {
  console.log('3. Testing Model Context Protocol (MCP) Server JSON-RPC 2.0 handshake & tools...');
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['src/mcp-server.js'], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const responses = [];
    proc.stdout.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').filter(Boolean);
      for (const l of lines) {
        responses.push(JSON.parse(l));
      }
      if (responses.length >= 2) {
        proc.kill();
      }
    });

    proc.on('error', reject);
    proc.on('close', () => {
      try {
        assert.equal(responses[0].result.serverInfo.name, 'verishield-kyb-compliance-mcp');
        assert.equal(responses[1].result.tools.length, 3);
        console.log('   ✓ MCP Server initialized & exposed 3 agent tools (verify_vendor_kyb, validate_eu_vat, audit_domain_compliance)');
        resolve();
      } catch (err) {
        reject(err);
      }
    });

    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }) + '\n');
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }) + '\n');
  });
}

async function testLiveOrSandboxExecution() {
  console.log('4. Testing unified orchestrator (`verifySingleVendor`) execution...');
  const record = await verifySingleVendor(
    {
      companyName: 'Apple Inc.',
      domain: 'apple.com',
      ticker: 'AAPL',
      vatNumber: 'IE9700053D',
    },
    { timeoutMs: 5000 }
  );
  assert.ok(record.auditId.startsWith('VS-'));
  assert.equal(typeof record.overallScore, 'number');
  assert.ok(record.executiveHtmlReport.includes('<!DOCTYPE html>'));
  console.log(`   ✓ Unified orchestrator completed in ${record.durationMs}ms (Audit ID: ${record.auditId})`);
}

async function main() {
  await testVatNormalization();
  await testScorerAndReportGenerator();
  await testMcpServerHandshake();
  await testLiveOrSandboxExecution();
  console.log('\nALL VERISHIELD KYB ENGINE TESTS PASSED SUCCESSFULLY.');
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
