// src/communication/channels/implementation/email/oauth/gmail-oauth.types.ts
//
// Gmail-specific types for the OAuth 2.0 connection lifecycle.
//
// Official source: https://developers.google.com/identity/protocols/oauth2/web-server
//                   https://developers.google.com/gmail/api/reference/rest
//
// Unlike Xero, the OAuth client (clientId/clientSecret) is a single Relay-owned
// Google Cloud OAuth app — configured once via env vars, never stored per
// credential. Each ProviderCredentials record only holds the per-mailbox
// tokens obtained after the user completes Google's consent screen.

// ─── Google API endpoints (official) ─────────────────────────────────────────

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

/** Base URL for the Gmail API v1. */
export const GMAIL_API_BASE_URL = 'https://gmail.googleapis.com/gmail/v1';

// ─── Token lifetimes ──────────────────────────────────────────────────────────

/** Google access tokens expire after 1 hour (3600 seconds). */
export const GOOGLE_ACCESS_TOKEN_TTL_SEC = 3600;

/** Safety window: refresh the access token this many seconds before expiry. */
export const GOOGLE_TOKEN_REFRESH_BUFFER_SEC = 60;

/**
 * Default OAuth scope for reading a mailbox.
 * Override via GOOGLE_EMAIL_OAUTH_SCOPES.
 *
 * gmail.readonly is a Google "restricted" scope — see verification/CASA
 * requirements before enabling this for all customers in production.
 */
export const GMAIL_DEFAULT_SCOPES =
  'https://www.googleapis.com/auth/gmail.readonly';

// ─── Google API response types ───────────────────────────────────────────────

/** Response from POST https://oauth2.googleapis.com/token (code exchange or refresh). */
export type GoogleTokenResponse = {
  access_token: string;
  /** Only present on the initial code exchange — Google does not rotate refresh tokens. */
  refresh_token?: string;
  /** Seconds until the access token expires (typically 3600). */
  expires_in: number;
  token_type: 'Bearer';
  /** Space-separated list of granted scopes. */
  scope: string;
  id_token?: string;
};

/** GET https://gmail.googleapis.com/gmail/v1/users/me/profile */
export type GmailProfile = {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
};

/** One entry from GET .../messages (list — ids only, no content). */
export type GmailMessageListItem = {
  id: string;
  threadId: string;
};

export type GmailMessageListResponse = {
  messages?: GmailMessageListItem[];
  nextPageToken?: string;
  resultSizeEstimate: number;
};

/** A single header from a Gmail message payload. */
export type GmailMessageHeader = { name: string; value: string };

/** GET .../messages/{id}?format=metadata — safe subset used for the table view. */
export type GmailMessageSummary = {
  id: string;
  threadId: string;
  snippet: string;
  internalDate: string;
  labelIds?: string[];
  from: string;
  to: string;
  subject: string;
  date: string;
};

// ─── Server-side state (Redis storage) ───────────────────────────────────────

/**
 * OAuth flow state stored server-side in Redis.
 *
 * Key: `gmail:oauth:state:{stateToken}`
 * TTL: 600 seconds. Single-use — consumed and deleted on first read.
 * Never sent to the browser — only the opaque `state` token is.
 */
export type GmailOAuthStateData = {
  /** Validated against JWT companyId on callback. */
  companyId: string;
  /** ProviderCredentials._id — the shell record to populate after consent. */
  providerCredentialsId: string;
  /** PKCE code verifier (RFC 7636). Never sent to the browser. */
  codeVerifier: string;
  /** Optional relative frontend path to redirect to after success. */
  returnPath?: string;
  /** Unix timestamp (seconds) when this state was created. */
  createdAt: number;
};

// ─── API response shapes ─────────────────────────────────────────────────────

/** Result of verifying a Gmail OAuth connection. */
export type GmailConnectionStatus = {
  connected: boolean;
  providerKey: 'gmail_oauth';
  emailAddress: string | null;
  grantedScopes: string | null;
  tokenExpiresAt: string | null;
  checkedAt: string;
  reason?: string;
};
