// src/channels/implementation/sms/oauth/oauth-sms.types.ts

export type OAuthSmsProviderKey =
  | 'twilio'
  | 'messagebird'
  | 'vonage'
  | 'telstra'
  | string;

/**
 * ✅ Contrato estándar para SMS via OAuth
 * (tokens + refresh + expiración)
 */
export type OAuthSmsCredentials = {
  providerKey?: OAuthSmsProviderKey;

  /** ✅ requeridos */
  accessToken: string;

  /** ✅ opcionales (pero recomendados) */
  refreshToken?: string;
  tokenType?: 'Bearer' | string;
  expiresAt?: string; // ISO date string

  /**
   * Algunos providers requieren cuenta/tenant/projectId.
   * Lo dejamos genérico y opcional.
   */
  accountId?: string;
};
