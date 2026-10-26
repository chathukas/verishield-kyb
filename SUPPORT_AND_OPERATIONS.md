# ⚙️ Autonomous Operations, Customer Onboarding & Sri Lanka Payout Playbook

## 1. Sri Lanka Payout & Tax Compliance Setup

### Channel A: Apify Store (80% Developer Revenue Share)
1. **Account & KYC:** Log in to [console.apify.com](https://console.apify.com) → **Development → Insights → Payouts**.
2. **Identity Verification:** Complete mandatory KYC using a valid Sri Lankan Passport or National ID / Driver's License matching your legal name.
3. **Payout Method:**
   - **Option 1 (Lowest Threshold — $20 min):** Link Wise or PayPal (if you hold a receiving-enabled account).
   - **Option 2 (Direct Bank / Payoneer — $100 min):** Select Bank Transfer / Wire and enter your Payoneer USD/EUR Global Payment Service receiving details or your Sri Lankan Personal Foreign Currency (PFC) / commercial bank SWIFT details (Commercial Bank, HNB, Sampath Bank, DFCC).
4. **Billing Cycle:** Invoices auto-generate on the **11th of each month** and auto-approve on the **14th**.

### Channel B: Lemon Squeezy (Merchant of Record — Global VAT/Sales Tax Handled)
1. **Account & Store Verification:** Create a seller store at [lemonsqueezy.com](https://www.lemonsqueezy.com). Lemon Squeezy acts as the official Merchant of Record (MoR), calculating and remitting EU VAT, UK VAT, and US state sales tax automatically.
2. **Payouts to Sri Lanka:** Go to **Settings → Payouts** and select **Sri Lanka** (officially supported for direct bank transfers) or link your Payoneer US receiving routing/account details. Minimum payout threshold is **$50 USD**, paid twice monthly (1st and 15th).

---

## 2. Automated Maintenance & Zero-Touch Quality Control

- **Daily Canary Health Check:** `.github/workflows/compliance-monitor.yml` (copied from `automations/github-action-compliance.yml`) runs `npm test` daily at 06:00 UTC on GitHub Actions free tier. If any upstream official registry changes its schema or fails, GitHub automatically sends an email alert.
- **Zero Anti-Bot Fragility:** Because VeriShield queries official JSON/REST registries (`api.gleif.org`, `ec.europa.eu/taxation_customs/vies/rest-api`, `data.sec.gov`, `npiregistry.cms.hhs.gov`) and standard DNS/HTTP headers rather than scraping brittle DOM selectors behind residential proxies, maintenance overhead is near zero.
- **Automated Customer Support Triage:** All Apify Actor issues and Lemon Squeezy buyer inquiries can be answered using the standardized troubleshooting FAQ in `README.md` (covering EU VIES member-state maintenance windows and SEC EDGAR rate limits).
