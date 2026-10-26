#!/usr/bin/env node
/**
 * Standalone CLI for VeriShield KYB & Compliance Engine
 * Supports single-entity CLI flags or batch JSON/CSV file auditing with white-label HTML report export.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { verifySingleVendor } from './engine/index.js';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help || Object.keys(args).length === 0) {
    console.log(`
VeriShield KYB & Regulatory Compliance CLI v1.0.0
==================================================
Usage:
  node src/cli.js --company "Apple Inc." --domain "apple.com" --ticker "AAPL"
  node src/cli.js --company "Siemens AG" --domain "siemens.com" --country "DE"
  node src/cli.js --input vendors.json --out ./output --brand "Acme Compliance Partners"

Options:
  --company <name>      Legal or trading name of vendor
  --domain <domain>     Corporate domain to audit (SPF, DMARC, NIS2 headers, GDPR, EAA)
  --lei <20-char-lei>   Global Legal Entity Identifier (GLEIF)
  --vat <eu-vat-id>     EU VAT number to verify via European Commission VIES
  --ticker <symbol>     US stock ticker symbol (SEC EDGAR)
  --cik <cik-number>    US SEC CIK number
  --npi <10-digit-npi>  US Healthcare NPPES NPI number
  --country <ISO-2>     2-letter ISO country code
  --input <path.json>   Path to JSON array of vendor objects for batch processing
  --out <dir>           Directory to save JSON dataset and Executive HTML certificates (default: ./output)
  --brand <name>        White-label brand name for generated Executive HTML Certificates
`);
    process.exit(0);
  }

  const outDir = path.resolve(process.cwd(), args.out || './output');
  await fs.mkdir(outDir, { recursive: true });

  let vendors = [];
  if (args.input) {
    const raw = await fs.readFile(path.resolve(process.cwd(), args.input), 'utf8');
    const parsed = JSON.parse(raw);
    vendors = Array.isArray(parsed) ? parsed : parsed.vendors || [parsed];
  } else {
    vendors = [
      {
        companyName: args.company || null,
        domain: args.domain || null,
        lei: args.lei || null,
        vatNumber: args.vat || null,
        ticker: args.ticker || null,
        cik: args.cik || null,
        npiNumber: args.npi || null,
        countryCode: args.country || null,
      },
    ];
  }

  const results = [];
  for (const v of vendors) {
    const record = await verifySingleVendor(v, {
      generateHtmlReport: true,
      brandConfig: {
        brandName: args.brand || 'VeriShield KYB & Compliance Intelligence',
      },
    });

    const slug = String(record.vendorName || record.auditId)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 45);
    const htmlFilename = `KYB_Certificate_${slug}_${record.auditId}.html`;
    const htmlPath = path.join(outDir, htmlFilename);
    await fs.writeFile(htmlPath, record.executiveHtmlReport, 'utf8');

    const summaryRecord = { ...record };
    delete summaryRecord.executiveHtmlReport;
    summaryRecord.certificateHtmlPath = htmlPath;
    results.push(summaryRecord);

    console.log(`\n✓ Audited: ${record.vendorName}`);
    console.log(`  Score: ${record.overallScore}/100 (Grade ${record.complianceGrade}) — ${record.decisionRecommendation}`);
    console.log(`  Passed Checks (${record.complianceSummary.passedChecksCount}):`);
    for (const c of record.complianceSummary.passedChecks) {
      console.log(`    + ${c}`);
    }
    if (record.complianceSummary.riskFlagsCount > 0) {
      console.log(`  Risk Flags (${record.complianceSummary.riskFlagsCount}):`);
      for (const f of record.complianceSummary.riskFlags) {
        console.log(`    ! ${f}`);
      }
    }
    console.log(`  Certificate saved: ${htmlPath}`);
  }

  const jsonOutPath = path.join(outDir, 'kyb_audit_results.json');
  await fs.writeFile(jsonOutPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\nBatch complete. Full JSON dataset written to: ${jsonOutPath}`);
}

main().catch((err) => {
  console.error('CLI Error:', err);
  process.exit(1);
});
