/**
 * Apify Actor Entry Point with Native Pay-Per-Event (PPE) Monetization (`Actor.charge()`)
 * Supports both Apify Cloud execution and local standalone execution (`APIFY_LOCAL_STORAGE_DIR` / `input.json`).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { verifySingleVendor } from './engine/index.js';

async function loadApifySdkIfAvailable() {
  try {
    const mod = await import('apify');
    return mod.Actor;
  } catch {
    return null;
  }
}

async function run() {
  const Actor = await loadApifySdkIfAvailable();
  let input = null;

  if (Actor) {
    await Actor.init();
    input = await Actor.getInput();
  } else {
    const inputPath = process.env.VERISHIELD_INPUT_FILE || path.resolve(process.cwd(), 'input.json');
    try {
      const raw = await fs.readFile(inputPath, 'utf8');
      input = JSON.parse(raw);
    } catch {
      input = {};
    }
  }

  const vendors = Array.isArray(input?.vendors) && input.vendors.length > 0
    ? input.vendors
    : [
        {
          companyName: input?.companyName || 'Apple Inc.',
          domain: input?.domain || 'apple.com',
          ticker: input?.ticker || 'AAPL',
          lei: input?.lei || null,
          vatNumber: input?.vatNumber || null,
        },
      ];

  const options = {
    enableGleif: input?.enableGleif !== false,
    enableVies: input?.enableVies !== false,
    enableSec: input?.enableSec !== false,
    enableNppes: Boolean(input?.enableNppes),
    enableDomainAudit: input?.enableDomainAudit !== false,
    generateHtmlReport: input?.generateHtmlReport !== false,
    brandConfig: {
      brandName: input?.whiteLabelBrandName || 'VeriShield KYB & Compliance Intelligence',
      brandSubtitle: input?.whiteLabelSubtitle || 'Automated Multi-Registry KYB, Tax & NIS2/EAA Technical Compliance Audit',
    },
    timeoutMs: Number(input?.timeoutMs) || 8000,
  };

  const results = [];
  const outputDir = path.resolve(process.cwd(), 'output');
  await fs.mkdir(outputDir, { recursive: true });

  for (let i = 0; i < vendors.length; i++) {
    const vendorInput = vendors[i];
    console.log(`[VeriShield] (${i + 1}/${vendors.length}) Auditing vendor:`, JSON.stringify(vendorInput));

    const record = await verifySingleVendor(vendorInput, options);
    const htmlReport = record.executiveHtmlReport;

    // Save HTML report to Key-Value Store (on Apify) and local output directory
    const safeSlug = String(record.vendorName || record.auditId)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
    const reportKey = `REPORT_${safeSlug}_${record.auditId}.html`;

    const datasetItem = { ...record };
    delete datasetItem.executiveHtmlReport; // Keep dataset row lean
    datasetItem.reportFileName = options.generateHtmlReport ? reportKey : null;

    if (Actor) {
      // Triggers native `apify-default-dataset-item` PPE billing automatically
      await Actor.pushData(datasetItem);

      if (htmlReport && options.generateHtmlReport) {
        await Actor.setValue(reportKey, htmlReport, { contentType: 'text/html' });
        if (typeof Actor.charge === 'function') {
          try {
            await Actor.charge({ eventName: 'compliance-report-generated', count: 1 });
          } catch (chargeErr) {
            console.warn('[VeriShield] Actor.charge(compliance-report-generated) notice:', chargeErr.message);
          }
        }
      }
    } else {
      if (htmlReport && options.generateHtmlReport) {
        const localReportPath = path.join(outputDir, reportKey);
        await fs.writeFile(localReportPath, htmlReport, 'utf8');
        datasetItem.localReportPath = localReportPath;
      }
    }

    results.push(datasetItem);
    console.log(
      `[VeriShield] Completed: ${record.vendorName} -> Score: ${record.overallScore}/100 (${record.complianceGrade}) [${record.decisionRecommendation}]`
    );
  }

  if (!Actor) {
    const datasetPath = path.join(outputDir, 'dataset.json');
    await fs.writeFile(datasetPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`[VeriShield] Saved ${results.length} verified records to ${datasetPath}`);
  } else {
    await Actor.setValue('SUMMARY', {
      totalAudited: results.length,
      completedAt: new Date().toISOString(),
      averageScore:
        results.length > 0
          ? Math.round(results.reduce((acc, r) => acc + r.overallScore, 0) / results.length)
          : 0,
    });
    await Actor.exit();
  }
}

run().catch((err) => {
  console.error('[VeriShield] Fatal error:', err);
  process.exit(1);
});
