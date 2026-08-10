// src/accounting/providers/xero/xero.oauth.types.ts
//
// Xero-specific types for the OAuth 2.0 connection lifecycle.
//
// Official source: https://developer.xero.com/documentation/guides/oauth2/
//
// All types are derived from the current official Xero API documentation.
// Do not use these types outside the accounting/providers/xero/ folder.
//
// Scope definitions are NOT in this file.  They live in xero-scope.constants.ts
// and are derived from the implemented AccountingCapability set.

import { XERO_ACCOUNTING_SCOPES } from './xero-scope.constants';

// ─── Xero API endpoints (official) ───────────────────────────────────────────

export const XERO_AUTH_URL =
  'https://login.xero.com/identity/connect/authorize';

export const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token';

/** GET/DELETE: list or remove an authorised connection. */
export const XERO_CONNECTIONS_URL = 'https://api.xero.com/connections';

/** Base URL for the Xero Accounting API v2.0. */
export const XERO_ACCOUNTING_BASE_URL = 'https://api.xero.com/api.xro/2.0';

// ─── Token lifetimes (official) ──────────────────────────────────────────────

/** Xero access tokens expire after 30 minutes (1800 seconds). */
export const XERO_ACCESS_TOKEN_TTL_SEC = 1800;

/** Safety window: refresh the access token this many seconds before expiry. */
export const XERO_TOKEN_REFRESH_BUFFER_SEC = 60;

/**
 * Default OAuth scope string for the Xero authorization URL.
 *
 * Derived from the canonical capability-based scope model in
 * xero-scope.constants.ts.  Never hardcoded here.
 *
 * Override via XERO_OAUTH_SCOPES environment variable (see .env.example).
 * The override must comply with Xero's granular scope model; legacy broad
 * scopes (accounting.reports.read, etc.) are rejected by new app registrations.
 */
export const XERO_DEFAULT_SCOPES = XERO_ACCOUNTING_SCOPES;

// ─── Xero API response types ──────────────────────────────────────────────────

/** Response from POST /connect/token (both code exchange and refresh). */
export type XeroTokenResponse = {
  access_token: string;
  refresh_token: string;
  /** Seconds until the access token expires (typically 1800). */
  expires_in: number;
  token_type: 'Bearer';
  /** Space-separated list of granted scopes. */
  scope: string;
  /** OIDC identity token — present when openid scope was requested. */
  id_token?: string;
};

/** One item from GET https://api.xero.com/connections. */
export type XeroConnectionItem = {
  /** UUID identifying this connection record — used for DELETE /connections/{id}. */
  id: string;
  /** UUID linking this connection to the specific auth event that created it. */
  authEventId: string;
  /** UUID of the Xero organisation or practice. Required in xero-tenant-id header. */
  tenantId: string;
  /** 'ORGANISATION' | 'PRACTICEMANAGER' | string */
  tenantType: string;
  /** Display name of the tenant. May be null for some tenant types. */
  tenantName: string | null;
  createdDateUtc: string;
  updatedDateUtc: string;
};

/** Subset of GET /api.xro/2.0/Organisations → Organisations[0]. */
export type XeroOrganisationSummary = {
  Name: string;
  LegalName?: string;
  CountryCode?: string;
  BaseCurrency?: string;
  OrganisationStatus?: string;
};

// ─── Server-side state (Redis storage) ───────────────────────────────────────

/**
 * OAuth flow state stored server-side in Redis.
 *
 * Key: `xero:oauth:state:{stateToken}`
 * TTL: 600 seconds (10 minutes). Auth codes expire in 5 minutes; this gives
 *      extra headroom for network latency without lingering state long-term.
 * Access: single-use — consumed and deleted on first use.
 *
 * Never sent to the browser. The browser only receives the opaque `state`
 * token which keys into this data.
 */
export type XeroOAuthStateData = {
  /** Validated against JWT companyId on callback. */
  companyId: string;
  /** ProviderCredentials._id — the record to update after successful OAuth. */
  providerCredentialsId: string;
  /**
   * PKCE code verifier (RFC 7636).
   * Generated on the server during start; included in the token exchange.
   * Never sent to the browser.
   */
  codeVerifier: string;
  /**
   * Optional frontend path to redirect to after successful OAuth.
   * Validated server-side before use — must be a relative path, not an
   * absolute URL, to prevent open-redirect attacks.
   */
  returnPath?: string;
  /** Unix timestamp (seconds) when this state was created. */
  createdAt: number;
};

/**
 * Pending tenant session stored server-side in Redis.
 *
 * Used when the user's Xero account is connected to multiple organisations
 * and the platform must present a tenant-selection screen.
 *
 * Key: `xero:oauth:pending:{sessionId}`
 * TTL: 300 seconds (5 minutes). Tokens obtained during code exchange are
 *      held briefly while the user selects a tenant. If the user does not
 *      complete selection within this window they must restart the flow.
 *
 * The sessionId is a random UUID — never a deterministic or predictable value.
 * The browser only receives the opaque sessionId; all token data is server-side.
 */
export type XeroPendingTenantSessionData = {
  /** Authenticated user's company — validated against JWT on tenant selection. */
  companyId: string;
  /** ProviderCredentials._id to update after tenant selection. */
  providerCredentialsId: string;
  /** Short-lived Xero access token (in-memory; discarded after tenant selection). */
  accessToken: string;
  /** Xero refresh token to persist after tenant selection. */
  refreshToken: string;
  /** Unix timestamp (seconds) when the access token expires. */
  expiresAt: number;
  /** Granted scopes from Xero. */
  scopes: string;
  /** Available tenant connections — safe metadata only. */
  connections: Array<{
    connectionId: string;
    tenantId: string;
    tenantType: string;
    tenantName: string | null;
  }>;
  /** Unix timestamp of session creation. */
  createdAt: number;
};

// ─── API response shapes ──────────────────────────────────────────────────────

/** Safe tenant option returned to the frontend for selection. No tokens included. */
export type XeroTenantOption = {
  connectionId: string;
  tenantId: string;
  tenantType: string;
  tenantName: string | null;
};

/** Result of verifying a Xero connection. */
export type XeroConnectionStatus = {
  connected: boolean;
  providerKey: 'xero';
  /** Redacted (first 8 + last 4 chars) tenant ID — safe for display. */
  tenantIdHint: string | null;
  tenantName: string | null;
  organisationName: string | null;
  /** Granted OAuth scopes summary — not a secret. */
  grantedScopes: string | null;
  /** ISO timestamp when the current access token expires. */
  tokenExpiresAt: string | null;
  /** ISO timestamp of the verification call. */
  checkedAt: string;
  /** Human-readable reason when connected is false. */
  reason?: string;
};
