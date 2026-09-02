// src/channels/implementation/email/oauth/oauth-email.types.ts

/**
 * EMAIL · OAUTH
 * Contrato estándar para credenciales OAuth de Email.
 *
 * NOTA:
 * - Esto NO intenta “adivinar” el provider (gmail/outlook). Eso viene por providerKey.
 * - Lo importante es estandarizar: accessToken + (refreshToken opcional) + expiración.
 */
export type OAuthEmailProviderKey =
  | 'gmail'
  | 'outlook'
  | 'office365'
  | 'google_workspace'
  | 'microsoft_graph'
  | string;

export type OAuthEmailCredentials = {
  providerKey?: OAuthEmailProviderKey;

  /**
   * The Google Cloud OAuth 2.0 app credentials — entered by the user in the
   * credential form (same model as Xero: bring-your-own OAuth app, not a
   * shared platform-level app). Not a secret to log; clientSecret must be
   * encrypted at rest.
   *
   * Mutually exclusive with `oauthApplicationId`: either the credential
   * carries its own clientId/clientSecret, or it points at a reusable
   * OAuthApplication registration (see oauth-applications module) that
   * supplies them instead — letting one Google app back both the Email and
   * Identity channels without re-entering the secret.
   */
  clientId?: string;
  clientSecret?: string;
  oauthApplicationId?: string;

  // Optional at creation time — a "shell" credential can exist before the
  // OAuth consent flow completes (mirrors XeroOAuthCredentials Phase 1/2).
  // Populated by the provider's OAuth callback handler once connected.
  accessToken?: string;

  // ✅ opcionales (pero recomendados para background refresh)
  refreshToken?: string;

  // unix seconds o ms, o ISO; normalizamos a ISO
  expiresAt?: string; // ISO string

  // opcional: algunos providers requieren/usan tenant o scopes
  tenantId?: string;
  scopes?: string[]; // normalizado a array

  // Gmail OAuth — the connected mailbox address, set by the OAuth callback
  // after a successful Gmail API profile lookup. Safe to display (not a secret).
  emailAddress?: string;
};
