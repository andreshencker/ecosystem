// src/accounting/providers/xero/xero.credentials.contract.ts
//
// Xero OAuth 2.0 credential contract.
//
// Phase 1: Registers the Xero OAuth app credentials (clientId + clientSecret).
//   These identify the Communications App's Xero OAuth application.
//   They are required before any OAuth token exchange can be initiated.
//
// Phase 2 (deferred): After the OAuth authorization flow is complete,
//   the refreshToken, accessToken, tenantId, and expiresAt fields are
//   populated by the OAuth callback handler. These fields are optional here
//   so that an existing credential record can be updated in-place without
//   requiring re-entry of clientId and clientSecret.
//
// Security rules:
//   - clientId is safe to display; used as displayIdentifier (handled by
//     ProviderCredentialsService.deriveDisplayIdentifier via connectionType 'oauth').
//   - clientSecret, refreshToken, accessToken: never logged, never returned
//     in HTTP responses. Encrypted at rest by CryptoService.
//   - tenantId is not a secret but is obtained from Xero at runtime — stored
//     encrypted alongside other fields for simplicity.

import type { ContractSpec } from '../../../communication/channels/implementation/shared/credentials.types';
import {
  pick,
  requireField,
  strTrim,
  num,
} from '../../../communication/channels/implementation/shared/credentials.utils';

export type XeroOAuthCredentials = {
  /** Xero OAuth 2.0 app client ID. Not a secret; used as the displayIdentifier. */
  clientId: string;
  /** Xero OAuth 2.0 app client secret. Must be encrypted; never returned. */
  clientSecret: string;
  /**
   * Refresh token obtained after the OAuth authorization flow (Phase 2).
   * Optional at Phase 1 — populated by the OAuth callback handler.
   */
  refreshToken?: string;
  /**
   * Short-lived access token (Phase 2). Re-fetched from the refresh token
   * at runtime. Cached here to avoid redundant token refreshes.
   */
  accessToken?: string;
  /**
   * Xero tenant / organisation ID (Phase 2). Obtained from Xero's
   * /connections endpoint after the OAuth flow completes.
   */
  tenantId?: string;
  /** Access token expiry as a Unix timestamp in seconds (Phase 2). */
  expiresAt?: number;
  /** Granted OAuth scopes, space-separated (Phase 2). */
  scopes?: string;
};

const ALLOWED: (keyof XeroOAuthCredentials)[] = [
  'clientId',
  'clientSecret',
  'refreshToken',
  'accessToken',
  'tenantId',
  'expiresAt',
  'scopes',
];

export const XeroCredentialsContract: ContractSpec<XeroOAuthCredentials> = {
  // Declared as 'accounting' because ContractSpec.channelKey is metadata used for
  // routing in ProviderCredentialsService.getContractForProvider, which explicitly
  // handles both 'accounting' and 'billing' for the xero providerKey:
  //   if ((ck === 'accounting' || ck === 'billing') && pk === 'xero') return XeroCredentialsContract
  // No separate contract is needed for the billing channel — the credential
  // structure (clientId, clientSecret, tokens, tenantId) is identical across channels.
  channelKey: 'accounting' as any,
  connectionType: 'oauth',

  normalize(input) {
    const c: any = input ?? {};

    const clientId = strTrim(c.clientId ?? c.client_id ?? c.XERO_CLIENT_ID);
    const clientSecret = strTrim(
      c.clientSecret ?? c.client_secret ?? c.XERO_CLIENT_SECRET,
    );
    const refreshToken =
      strTrim(c.refreshToken ?? c.refresh_token ?? c.XERO_REFRESH_TOKEN) ||
      undefined;
    const accessToken =
      strTrim(c.accessToken ?? c.access_token ?? c.XERO_ACCESS_TOKEN) ||
      undefined;
    const tenantId =
      strTrim(c.tenantId ?? c.tenant_id ?? c.XERO_TENANT_ID) || undefined;
    const expiresAt = num(c.expiresAt ?? c.expires_at ?? c.XERO_EXPIRES_AT);
    const scopes = strTrim(c.scopes ?? c.XERO_SCOPES) || undefined;

    const normalized: XeroOAuthCredentials = {
      clientId,
      clientSecret,
      ...(refreshToken !== undefined && { refreshToken }),
      ...(accessToken !== undefined && { accessToken }),
      ...(tenantId !== undefined && { tenantId }),
      ...(expiresAt !== undefined && { expiresAt }),
      ...(scopes !== undefined && { scopes }),
    };

    return {
      value: pick<XeroOAuthCredentials>(
        normalized,
        ALLOWED,
      ) as XeroOAuthCredentials,
    };
  },

  validate(value) {
    requireField(value.clientId, 'clientId');
    requireField(value.clientSecret, 'clientSecret');
  },

  async verify(_value) {
    // Phase 1: format validation only.
    // Phase 2 will POST to https://identity.xero.com/connect/token with
    // grant_type=refresh_token to confirm the refresh token is valid and
    // obtain a fresh access token.
    return {
      ok: true,
      message:
        'Xero OAuth credentials format is valid. ' +
        'Complete the OAuth authorization flow to activate the connection.',
    };
  },
};
