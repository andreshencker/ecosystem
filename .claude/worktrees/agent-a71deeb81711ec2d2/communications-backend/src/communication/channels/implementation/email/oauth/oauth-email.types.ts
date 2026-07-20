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

  // ✅ requeridos
  accessToken: string;

  // ✅ opcionales (pero recomendados para background refresh)
  refreshToken?: string;

  // unix seconds o ms, o ISO; normalizamos a ISO
  expiresAt?: string; // ISO string

  // opcional: algunos providers requieren/usan tenant o scopes
  tenantId?: string;
  scopes?: string[]; // normalizado a array
};
