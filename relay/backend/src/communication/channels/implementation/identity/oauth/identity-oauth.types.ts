// src/communication/channels/implementation/identity/oauth/identity-oauth.types.ts
//
// Identity-specific types for the OAuth 2.0 "login with a provider" flow.
// Structurally mirrors the Email channel's Gmail OAuth types — same PKCE +
// state + token exchange mechanics — but the endpoints and resulting
// profile shape are provider-agnostic sign-in, not mailbox access.

// ─── Google OAuth endpoints (official) ───────────────────────────────────────

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_USERINFO_URL =
  'https://openidconnect.googleapis.com/v1/userinfo';

export const GOOGLE_ACCESS_TOKEN_TTL_SEC = 3600;
export const GOOGLE_TOKEN_REFRESH_BUFFER_SEC = 60;

/** Default scopes for a "Sign in with Google" identity flow (not mailbox access). */
export const GOOGLE_IDENTITY_DEFAULT_SCOPES = 'openid email profile';

// ─── Credentials shape (per ProviderCredentials record) ─────────────────────

export type IdentityOAuthCredentials = {
  providerKey?: string;

  /**
   * Bring-your-own OAuth app, OR a reference to a reusable OAuthApplication
   * registration (see oauth-applications module) — same dual model as the
   * Email channel's Gmail OAuth credentials, so the same Google app can back
   * both channels without re-entering the Client Secret.
   */
  clientId?: string;
  clientSecret?: string;
  oauthApplicationId?: string;

  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string; // ISO
  scopes?: string[];

  /** The verified identity from the provider — set after a successful login. */
  emailAddress?: string;
  displayName?: string;
  providerUserId?: string;
};

// ─── Google API response types ───────────────────────────────────────────────

export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: 'Bearer';
  scope: string;
  id_token?: string;
};

/** GET https://openidconnect.googleapis.com/v1/userinfo */
export type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

// ─── Server-side state (Redis storage) ───────────────────────────────────────

export type IdentityOAuthStateData = {
  companyId: string;
  providerCredentialsId: string;
  codeVerifier: string;
  returnPath?: string;
  createdAt: number;
};

// ─── API response shapes ─────────────────────────────────────────────────────

export type IdentityConnectionStatus = {
  connected: boolean;
  providerKey: 'google_identity';
  emailAddress: string | null;
  displayName: string | null;
  grantedScopes: string | null;
  tokenExpiresAt: string | null;
  checkedAt: string;
  reason?: string;
};
