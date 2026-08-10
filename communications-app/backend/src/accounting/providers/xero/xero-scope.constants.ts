// src/accounting/providers/xero/xero-scope.constants.ts
//
// Canonical Xero OAuth 2.0 scope definitions for the Accounting channel.
//
// Scope knowledge belongs entirely to the Xero provider folder.  No generic
// OAuth component, accounting infrastructure, or frontend code should contain
// Xero scope strings — all scope logic lives here.
//
// Background:
//   Xero switched to a granular scope model for applications registered on or
//   after its rollout.  Legacy broad scopes (accounting.reports.read,
//   accounting.settings, accounting.transactions) are rejected by new
//   applications with invalid_scope.  Only the granular scopes listed in the
//   XeroScope constant object below are valid for new app registrations.
//
// Architecture:
//   AccountingCapability (implemented only)
//       → CAPABILITY_SCOPES (capability → scopes mapping)
//       → buildXeroScopes()  (deduplicates, sorts, joins)
//       → XERO_ACCOUNTING_SCOPES  (canonical string used at runtime)
//       → Authorization URL scope parameter

import { AccountingCapability } from '../../enums/accounting-capability.enum';

// ─── Xero scope identifiers ───────────────────────────────────────────────────

/**
 * Valid Xero OAuth 2.0 scope identifiers under the granular scope model.
 *
 * Only scopes accepted by new Xero application registrations are listed.
 * Legacy broad scopes are intentionally absent:
 *   ✗  accounting.reports.read       — rejected by new apps (invalid_scope)
 *   ✗  accounting.read               — broad alias, no longer accepted
 *   ✗  accounting.transactions       — broad alias, rejected by new apps (invalid_scope)
 *   ✗  profile                       — OIDC user profile, not needed for API access
 *   ✗  email                         — OIDC user email, not needed for API access
 */
export const XeroScope = {
  // ── OIDC identity ─────────────────────────────────────────────────────────
  // Required by Xero's OIDC-based authorization server for every OAuth flow.
  OpenId: 'openid',

  // ── Token lifecycle ───────────────────────────────────────────────────────
  // Without this scope Xero does not issue a refresh token.
  OfflineAccess: 'offline_access',

  // ── Accounting — Settings (read-only) ────────────────────────────────────
  // Covers read access to: Chart of Accounts, Organisations, Tax Rates,
  // Currencies, Users, Branding Themes, Tracking Categories.
  AccountingSettingsRead: 'accounting.settings.read',

  // ── Accounting — Settings (read + write) ─────────────────────────────────
  // Write scope for Chart of Accounts (create, update, archive, delete).
  // Also covers all read operations included in accounting.settings.read.
  AccountingSettings: 'accounting.settings',

  // ── Accounting — Bank Transactions ───────────────────────────────────────
  // Granular scope for the BankTransactions endpoint (GET/POST/PUT/DELETE
  // /api.xro/2.0/BankTransactions).  Replaces the deprecated broad scope
  // accounting.transactions.read which is rejected by new app registrations.
  AccountingBankTransactionsRead: 'accounting.banktransactions.read',

  // ── Accounting — Manual Journals ─────────────────────────────────────────
  // Write scope (includes read) for POST/PUT /api.xro/2.0/ManualJournals.
  // Do NOT use the deprecated accounting.transactions scope for this endpoint.
  AccountingManualJournals: 'accounting.manualjournals',

  // Read-only scope for GET /api.xro/2.0/ManualJournals (list/get only).
  AccountingManualJournalsRead: 'accounting.manualjournals.read',

  // ── Accounting — General Ledger Journals (read-only) ─────────────────────
  // Read-only scope for GET /api.xro/2.0/Journals (general ledger view).
  AccountingJournalsRead: 'accounting.journals.read',

  // ── Accounting — Granular report scopes ───────────────────────────────────
  // Each value corresponds to one report endpoint in the Xero Accounting API.
  ReportsBankSummaryRead: 'accounting.reports.banksummary.read',
  ReportsBalanceSheetRead: 'accounting.reports.balancesheet.read',
  ReportsBudgetSummaryRead: 'accounting.reports.budgetsummary.read',
  ReportsExecutiveSummaryRead: 'accounting.reports.executivesummary.read',
  ReportsProfitAndLossRead: 'accounting.reports.profitandloss.read',
  ReportsTrialBalanceRead: 'accounting.reports.trialbalance.read',
  ReportsTaxReportsRead: 'accounting.reports.taxreports.read',
  ReportsTenNinetyNineRead: 'accounting.reports.tenninetynine.read',
} as const;

export type XeroScopeValue = (typeof XeroScope)[keyof typeof XeroScope];

// ─── Base scopes — required for all connections ────────────────────────────────

/**
 * Scopes included in every Xero authorization request regardless of capability.
 *
 *  openid         — Xero's authorization server is OIDC-based; this scope is
 *                   required to produce a valid authorization code.
 *  offline_access — Required for Xero to issue a refresh token.  Without it,
 *                   the access token cannot be renewed after it expires.
 */
const XERO_BASE_SCOPES: readonly XeroScopeValue[] = [
  XeroScope.OpenId,
  XeroScope.OfflineAccess,
];

// ─── Capability → scope mapping ───────────────────────────────────────────────

/**
 * Maps each CURRENTLY IMPLEMENTED AccountingCapability to the minimum set of
 * Xero OAuth scopes required by its implemented API calls.
 *
 * Rules:
 *  - Only capabilities with status === Available in xero-accounting.capabilities.ts
 *    belong here.  Planned/unsupported capabilities must not add scopes.
 *  - Each capability lists only the scopes required by its existing endpoints.
 *    Endpoints that throw NotImplementedException do not contribute scopes.
 *  - When a new capability is implemented, add it here together with its
 *    endpoints' scope requirements.
 *
 * Xero API endpoint → minimum granular scope (new app model):
 *
 *   Banking (AccountingCapability.Banking — status: Available):
 *     GET /api.xro/2.0/Accounts?Type=BANK     → accounting.settings (write covers read)
 *     GET /api.xro/2.0/Accounts/{AccountID}   → accounting.settings
 *     GET /api.xro/2.0/Reports/BankSummary    → accounting.reports.banksummary.read
 *     GET /api.xro/2.0/Organisations          → accounting.settings
 *     GET https://api.xero.com/connections    → bearer token only (no extra scope)
 *
 *   BankTransactions (AccountingCapability.BankTransactions — status: Available):
 *     GET /api.xro/2.0/BankTransactions       → accounting.banktransactions.read
 *
 *   ManualJournals (AccountingCapability.ManualJournals — status: Available):
 *     GET/POST/PUT /api.xro/2.0/ManualJournals → accounting.manualjournals (write includes read)
 *
 *   Journals (AccountingCapability.Journals — status: Available, read-only General Ledger):
 *     GET /api.xro/2.0/Journals               → accounting.journals.read
 *
 *   ChartOfAccounts (AccountingCapability.ChartOfAccounts — status: Available):
 *     GET/PUT/POST/DELETE /api.xro/2.0/Accounts → accounting.settings
 */
const CAPABILITY_SCOPES: Partial<
  Record<AccountingCapability, readonly XeroScopeValue[]>
> = {
  [AccountingCapability.Banking]: [
    XeroScope.AccountingSettings,
    XeroScope.ReportsBankSummaryRead,
  ],
  [AccountingCapability.BankTransactions]: [
    XeroScope.AccountingBankTransactionsRead,
  ],
  [AccountingCapability.ManualJournals]: [XeroScope.AccountingManualJournals],
  [AccountingCapability.Journals]: [XeroScope.AccountingJournalsRead],
  [AccountingCapability.ChartOfAccounts]: [XeroScope.AccountingSettings],
};

// ─── Scope builder ────────────────────────────────────────────────────────────

/**
 * Builds a deterministic, deduplicated Xero OAuth scope string for the given
 * set of AccountingCapability values.
 *
 * Always includes base scopes (openid, offline_access).
 * Adds only the scopes required by the supplied capabilities.
 * Scopes are sorted alphabetically for determinism and reproducibility.
 * Duplicate scopes from overlapping capabilities are eliminated by the Set.
 *
 * @param capabilities  Implemented capabilities to include scopes for.
 * @returns Space-separated, sorted, deduplicated Xero OAuth scope string.
 */
export function buildXeroScopes(
  capabilities: readonly AccountingCapability[],
): string {
  const scopes = new Set<XeroScopeValue>(XERO_BASE_SCOPES);

  for (const cap of capabilities) {
    const capScopes = CAPABILITY_SCOPES[cap];
    if (capScopes) {
      for (const s of capScopes) {
        scopes.add(s);
      }
    }
  }

  return [...scopes].sort().join(' ');
}

// ─── Current canonical scope string ──────────────────────────────────────────

/**
 * The canonical Xero OAuth scope string for the currently implemented
 * Accounting capabilities (Banking + BankTransactions + ManualJournals + Journals + ChartOfAccounts).
 *
 * Derived by buildXeroScopes — never hardcoded.  Adding a new capability
 * to CAPABILITY_SCOPES automatically expands this string.
 *
 * Effective scope list (sorted alphabetically):
 *   accounting.banktransactions.read     → GET /BankTransactions
 *   accounting.journals.read             → GET /Journals (General Ledger, read-only)
 *   accounting.manualjournals            → GET/POST/PUT /ManualJournals (write includes read)
 *   accounting.reports.banksummary.read  → GET /Reports/BankSummary
 *   accounting.settings                  → GET/PUT/POST/DELETE /Accounts, GET /Organisations
 *   offline_access                       → refresh token support
 *   openid                               → Xero OIDC requirement
 *
 * To override for a specific environment:
 *   Set XERO_OAUTH_SCOPES in .env (see .env.example).
 *   The override must comply with Xero's granular scope model — legacy broad
 *   scopes (accounting.reports.read etc.) will be rejected.
 */
export const XERO_ACCOUNTING_SCOPES: string = buildXeroScopes([
  AccountingCapability.Banking,
  AccountingCapability.BankTransactions,
  AccountingCapability.ManualJournals,
  AccountingCapability.Journals,
  AccountingCapability.ChartOfAccounts,
]);
