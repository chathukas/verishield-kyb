# 📦 Marketplace Listings, Pricing & Launch Configuration Guide

This file contains the exact copy-paste configurations for launching **VeriShield KYB** across **Apify Store**, **Lemon Squeezy**, **MCP Registries (Smithery / PulseMCP / mcpservers.org)**, and **n8n Creator Hub**.

---

## 1. Apify Store — Pay-Per-Event (PPE) Pricing Configuration

When publishing `verishield-kyb-compliance-engine` on the Apify Console (**Publication → Monetization → Pay per event**):

| Event Name (in code) | Event Title | Unit Price (USD) | Customer Equivalent | Description |
| :--- | :--- | :--- | :--- | :--- |
| `vendor-verified` | Verified Vendor Record | **$0.003** | **$3.00 / 1,000 vendors** | Charged per vendor verified across GLEIF, VIES, SEC EDGAR, NPPES & Domain Audit |
| `compliance-report-generated` | Executive White-Label HTML Certificate | **$0.005** | **$5.00 / 1,000 reports** | Charged when `generateHtmlReport: true` stores an Executive HTML Compliance Certificate |

### Apify Store SEO Metadata
- **Actor Title:** `B2B Vendor KYB, GLEIF LEI, EU VIES VAT, SEC & NIS2/EAA Compliance Auditor`
- **SEO Title (`seoTitle`):** `B2B Vendor KYB, GLEIF LEI, EU VAT VIES & NIS2 Domain Compliance API`
- **SEO Description (`seoDescription`):** `Automate B2B vendor onboarding, KYB verification, GLEIF LEI lookup, EU VIES VAT validation, SEC EDGAR checks, and NIS2/GDPR/EAA domain compliance scoring via API or MCP.`
- **Categories:** `Business & Lead Generation`, `AI & MCP Agents`, `Developer Tools`

---

## 2. Lemon Squeezy — Self-Serve Digital Product Tiers

### Tier A: VeriShield KYB — Developer CLI & n8n Automation Pack ($29 One-Time)
- **Product Name:** `VeriShield KYB — Standalone CLI, Local MCP Server & n8n Automation Pack`
- **Price:** `$29.00 USD` (One-time purchase, instant ZIP download + GitHub release access)
- **Deliverable ZIP Contents:**
  - Full Node.js ESM source code (`src/`, `package.json`)
  - Local Claude/Cursor MCP Server (`src/mcp-server.js`)
  - Ready-to-import n8n workflow (`automations/n8n-vendor-kyb-workflow.json`)
  - GitHub Actions weekly compliance monitor (`automations/github-action-compliance.yml`)

### Tier B: VeriShield KYB — White-Label Agency & Compliance Consultancy License ($79 One-Time)
- **Product Name:** `VeriShield KYB — White-Label Agency & Commercial Audit Certificate License`
- **Price:** `$79.00 USD` (One-time commercial license)
- **Highlights:**
  - Includes custom `--brand` and `whiteLabelBrandName` rights to sell Executive KYB, NIS2 Header & EAA Compliance Audit Certificates directly to B2B clients.
  - Unlimited offline batch audits with zero per-lookup API fees.

---

## 3. MCP Directories Submission Copy (Smithery.ai, mcpservers.org, Glama.ai, PulseMCP)

- **Server Name:** `verishield-kyb-compliance-mcp`
- **Short Description:** `Automated B2B Vendor KYB & Regulatory Compliance MCP server verifying GLEIF LEI, EU VIES VAT, US SEC EDGAR, HHS NPI, and NIS2/GDPR/EAA domain security posture.`
- **Tools Exposed:**
  1. `verify_vendor_kyb` — Multi-registry entity & domain compliance check returning a 0–100 score.
  2. `validate_eu_vat` — Real-time EU Commission VIES VAT number validator.
  3. `audit_domain_compliance` — Live SPF/DMARC, NIS2 HTTP headers, `security.txt`, and GDPR/EAA signal inspector.
