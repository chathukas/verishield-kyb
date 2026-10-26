# 🛡️ VeriShield KYB — Automated B2B Vendor Registry, Tax & NIS2/EAA Compliance Engine

**VeriShield KYB** is an all-in-one automated B2B Vendor Know-Your-Business (KYB), Tax Registry, and Technical Compliance Audit Engine built for **procurement pipelines, fintech onboarding, compliance consultancies, n8n/Make automations, and AI agents (MCP)**.

In a single execution, VeriShield queries official global registries and live domain endpoints to compute a deterministic **0–100 Compliance Score (`A+` to `F`)**, structured JSON dataset, and a **White-Label Executive HTML/PDF Compliance Certificate**.

---

## 🔍 What VeriShield Verifies Automatically

1. **Global Legal Entity Identifier (`GLEIF API v1`)**
   - Verifies 20-character LEI codes or resolves legal company names across 3.4M+ registered entities in 200+ jurisdictions.
   - Extracts `entityStatus` (`ACTIVE` / `INACTIVE`), `registrationStatus` (`ISSUED` / `LAPSED`), local trade registry ID, managing LOU, BIC/MIC codes, and legal/headquarters addresses.
2. **EU Cross-Border VAT Validation (`European Commission VIES API`)**
   - Deterministic country-specific checksum/regex pre-validation across all 27 EU member states + Northern Ireland (`XI`).
   - Real-time VIES confirmation returning registered trader name and official address for 0% reverse-charge VAT compliance.
3. **US Public Company & Financial Filings (`SEC EDGAR API`)**
   - Resolves company name or stock ticker to 10-digit SEC CIK, SIC industry classification, state of incorporation, EIN, and recent `10-K`, `10-Q`, `8-K`, and `20-F` filings.
4. **US Healthcare & Medical Supplier Verification (`HHS CMS NPPES NPI API v2.1`)**
   - Validates 10-digit NPI numbers and organization providers (`NPI-2`), active status, authorized officials, and primary healthcare taxonomy licenses.
5. **Corporate Domain Cyber Hygiene, NIS2 Headers & EU GDPR/EAA Compliance Signals**
   - **Email Anti-Spoofing (BEC Prevention):** Verifies live DNS `MX`, `SPF` (`-all` vs `~all`), and `DMARC` (`p=reject` / `p=quarantine` / `p=none`) policies.
   - **NIS2 / ISO 27001 HTTP Security Headers:** Grades `Strict-Transport-Security` (HSTS), `Content-Security-Policy` (CSP), `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and RFC 9116 `/.well-known/security.txt`.
   - **EU GDPR & European Accessibility Act (EAA / EN 301 549) Signals:** Detects Consent Management Platforms (OneTrust, Cookiebot, Usercentrics, TrustArc, Google Consent Mode), Privacy Policy links, HTML `lang`, viewport zoom compliance, and image `alt` coverage.

---

## 🚀 Three Ways to Run VeriShield

### 1. Apify Cloud Actor (Pay-Per-Event API & Bulk UI)
Run bulk vendor lists directly in the [Apify Console](https://apify.com/stippled_wit/verishield-kyb-compliance-engine) or via the synchronous REST API:
```bash
curl -X POST "https://api.apify.com/v2/acts/stippled_wit~verishield-kyb-compliance-engine/run-sync-get-dataset-items?token=YOUR_APIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vendors": [
      { "companyName": "Siemens AG", "domain": "siemens.com", "vatNumber": "DE129273398", "countryCode": "DE" },
      { "companyName": "Apple Inc.", "domain": "apple.com", "ticker": "AAPL", "countryCode": "US" }
    ],
    "generateHtmlReport": true,
    "whiteLabelBrandName": "Your Compliance Team"
  }'
```

### 2. Model Context Protocol (MCP) Server for Claude, Cursor & AI Agents
Add VeriShield to your `claude_desktop_config.json` or `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "verishield-kyb": {
      "command": "node",
      "args": ["/absolute/path/to/src/mcp-server.js"]
    }
  }
}
```
Exposes three zero-latency tools:
- `verify_vendor_kyb`
- `validate_eu_vat`
- `audit_domain_compliance`

### 3. Standalone CLI (Batch JSON & White-Label Certificate Export)
```bash
node src/cli.js --company "Siemens AG" --domain "siemens.com" --vat "DE129273398" --brand "Acme Risk Advisory"
```
