#!/usr/bin/env node
/**
 * Model Context Protocol (MCP) JSON-RPC 2.0 Server (stdio transport)
 * Allows Claude Desktop, Cursor, Windsurf, and AI Agents to call VeriShield KYB tools natively.
 */

import readline from 'node:readline';
import { verifySingleVendor } from './engine/index.js';
import { verifyEuVat } from './engine/vies.js';
import { auditVendorDomain } from './engine/domainAudit.js';

const SERVER_INFO = {
  name: 'verishield-kyb-compliance-mcp',
  version: '1.0.0',
};

const TOOLS = [
  {
    name: 'verify_vendor_kyb',
    description:
      'Performs an automated B2B KYB entity verification and regulatory compliance audit across GLEIF (LEI), EU VIES (VAT), US SEC EDGAR (CIK/Ticker), HHS NPPES (NPI), and live domain cyber/GDPR/EAA signals. Returns a 0-100 risk score and compliance grade.',
    inputSchema: {
      type: 'object',
      properties: {
        companyName: { type: 'string', description: 'Legal or trading name of the company (e.g., "Siemens AG", "Apple Inc.")' },
        domain: { type: 'string', description: 'Corporate website domain (e.g., "siemens.com", "stripe.com")' },
        lei: { type: 'string', description: 'Optional 20-character Global Legal Entity Identifier (LEI)' },
        vatNumber: { type: 'string', description: 'Optional EU VAT number with country prefix (e.g., "IE3206488LH")' },
        ticker: { type: 'string', description: 'Optional US stock ticker symbol (e.g., "AAPL", "MSFT")' },
        cik: { type: 'string', description: 'Optional US SEC CIK number' },
        npiNumber: { type: 'string', description: 'Optional 10-digit US Healthcare NPI number' },
        countryCode: { type: 'string', description: 'Optional 2-letter ISO country code (e.g., "DE", "US", "GB")' },
      },
    },
  },
  {
    name: 'validate_eu_vat',
    description:
      'Validates an EU or Northern Ireland (XI) VAT number in real time against the European Commission VIES database and returns registered trader name and address.',
    inputSchema: {
      type: 'object',
      properties: {
        vatNumber: { type: 'string', description: 'EU VAT number including 2-letter country prefix (e.g., "DE129273398")' },
      },
      required: ['vatNumber'],
    },
  },
  {
    name: 'audit_domain_compliance',
    description:
      'Audits a corporate domain for email anti-spoofing (SPF, DMARC, MX), NIS2 HTTP security headers (HSTS, CSP, X-Frame-Options), RFC 9116 security.txt, GDPR consent management, and EU EAA (EN 301 549) HTML accessibility baseline signals.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Domain name or URL to audit (e.g., "cloudflare.com")' },
      },
      required: ['domain'],
    },
  },
];

function sendResponse(id, result) {
  const payload = JSON.stringify({ jsonrpc: '2.0', id, result });
  process.stdout.write(`${payload}\n`);
}

function sendError(id, code, message) {
  const payload = JSON.stringify({
    jsonrpc: '2.0',
    id,
    error: { code, message },
  });
  process.stdout.write(`${payload}\n`);
}

async function handleRequest(msg) {
  const { id, method, params } = msg;

  if (method === 'initialize') {
    return sendResponse(id, {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
      },
      serverInfo: SERVER_INFO,
    });
  }

  if (method === 'notifications/initialized') {
    return;
  }

  if (method === 'tools/list') {
    return sendResponse(id, { tools: TOOLS });
  }

  if (method === 'tools/call') {
    const toolName = params?.name;
    const args = params?.arguments || {};

    try {
      if (toolName === 'verify_vendor_kyb') {
        const res = await verifySingleVendor(args, { generateHtmlReport: false });
        return sendResponse(id, {
          content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        });
      }

      if (toolName === 'validate_eu_vat') {
        const res = await verifyEuVat({ vatNumber: args.vatNumber });
        return sendResponse(id, {
          content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        });
      }

      if (toolName === 'audit_domain_compliance') {
        const res = await auditVendorDomain({ domain: args.domain });
        return sendResponse(id, {
          content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        });
      }

      return sendError(id, -32601, `Unknown tool: ${toolName}`);
    } catch (err) {
      return sendResponse(id, {
        isError: true,
        content: [{ type: 'text', text: `Error executing ${toolName}: ${err.message}` }],
      });
    }
  }

  if (id !== undefined) {
    sendError(id, -32601, `Method not found: ${method}`);
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  terminal: false,
});

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const parsed = JSON.parse(trimmed);
    handleRequest(parsed);
  } catch {
    // Ignore malformed non-JSON lines
  }
});
