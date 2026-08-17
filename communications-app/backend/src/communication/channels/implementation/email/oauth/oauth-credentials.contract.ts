// src/channels/implementation/email/oauth/oauth-credentials.contract.ts

import type { ContractSpec } from '../../shared/credentials.types';
import { pick, requireField, strTrim } from '../../shared/credentials.utils';
import { CredentialsValidationError } from '../../shared/credentials.errors';
import type { OAuthEmailCredentials } from './oauth-email.types';

const ALLOWED: (keyof OAuthEmailCredentials)[] = [
  'providerKey',
  'clientId',
  'clientSecret',
  'oauthApplicationId',
  'accessToken',
  'refreshToken',
  'expiresAt',
  'tenantId',
  'scopes',
  'emailAddress',
];

// helpers locales (no las meto en shared para no contaminar)
function toIsoOrUndef(v: any): string | undefined {
  const raw = strTrim(v);
  if (!raw) return undefined;

  // ISO ya
  const d1 = new Date(raw);
  if (!Number.isNaN(d1.getTime())) return d1.toISOString();

  // num seconds/ms
  const n = Number(raw);
  if (Number.isFinite(n)) {
    const ms = n < 10_000_000_000 ? n * 1000 : n; // si parece seconds -> ms
    const d2 = new Date(ms);
    if (!Number.isNaN(d2.getTime())) return d2.toISOString();
  }

  return undefined;
}

function scopesToArray(v: any): string[] | undefined {
  if (v === undefined || v === null) return undefined;

  if (Array.isArray(v)) {
    const clean = v.map((x) => strTrim(x)).filter(Boolean);
    return clean.length ? clean : undefined;
  }

  const s = strTrim(v);
  if (!s) return undefined;

  // soporta: "a b c" o "a,b,c"
  const parts = s.includes(',') ? s.split(',') : s.split(' ');

  const clean = parts.map((x) => strTrim(x)).filter(Boolean);
  return clean.length ? clean : undefined;
}

export const OAuthEmailCredentialsContract: ContractSpec<OAuthEmailCredentials> =
  {
    channelKey: 'email',
    connectionType: 'oauth',

    normalize(input) {
      const c: any = input ?? {};

      // legacy / alternos comunes
      const clientId = strTrim(c.clientId ?? c.client_id ?? c.CLIENT_ID);
      const clientSecret = strTrim(
        c.clientSecret ?? c.client_secret ?? c.CLIENT_SECRET,
      );
      const oauthApplicationId =
        strTrim(c.oauthApplicationId ?? c.OAUTH_APPLICATION_ID) || undefined;
      const accessToken = strTrim(c.accessToken ?? c.ACCESS_TOKEN ?? c.token);
      const refreshToken =
        strTrim(c.refreshToken ?? c.REFRESH_TOKEN) || undefined;

      const providerKey = strTrim(c.providerKey ?? c.PROVIDER_KEY) || undefined;

      const expiresAt = toIsoOrUndef(
        c.expiresAt ?? c.EXPIRES_AT ?? c.expiry ?? c.expires_in,
      );

      const tenantId = strTrim(c.tenantId ?? c.TENANT_ID) || undefined;
      const scopes = scopesToArray(c.scopes ?? c.SCOPE ?? c.SCOPES);
      const emailAddress =
        strTrim(c.emailAddress ?? c.EMAIL_ADDRESS) || undefined;

      const normalized: OAuthEmailCredentials = {
        providerKey,
        clientId,
        clientSecret,
        oauthApplicationId,
        accessToken,
        refreshToken,
        expiresAt,
        tenantId,
        scopes,
        emailAddress,
      };

      // ✅ whitelist
      return {
        value: pick<OAuthEmailCredentials>(
          normalized,
          ALLOWED,
        ) as OAuthEmailCredentials,
      };
    },

    validate(value) {
      // clientId/clientSecret identify the caller's own Google Cloud OAuth
      // app — same bring-your-own-app model as Xero. Required at creation,
      // UNLESS this credential reuses an existing OAuthApplication instead
      // (see oauth-applications module) — then oauthApplicationId stands in
      // for both and the app's clientId/clientSecret are resolved from there.
      if (!value.oauthApplicationId) {
        requireField(value.clientId, 'clientId');
        requireField(value.clientSecret, 'clientSecret');
      }

      // accessToken is intentionally NOT required here — a credential record
      // can exist before the OAuth consent flow completes (the "Connect"
      // button creates the shell first, then the provider's OAuth callback
      // populates accessToken/refreshToken via a direct persistTokens() call
      // that bypasses this validation path, same as Xero's contract).

      // opcional: sanity checks
      if (value.expiresAt) {
        const d = new Date(value.expiresAt);
        if (Number.isNaN(d.getTime())) {
          throw new CredentialsValidationError(
            'Invalid expiresAt (must be ISO or timestamp)',
            'expiresAt',
          );
        }
      }

      if (value.scopes) {
        if (
          !Array.isArray(value.scopes) ||
          value.scopes.some((s) => !strTrim(s))
        ) {
          throw new CredentialsValidationError('Invalid scopes', 'scopes');
        }
      }
    },

    /**
     * ⚠️ Verificación real (API call) depende de provider.
     * - Para Gmail podrías llamar "profile" con OAuth2, etc.
     * - Para Microsoft Graph podrías llamar "/me".
     *
     * Por ahora dejamos verify opcional sin implementación.
     */
    // verify: async (value) => ({ ok: true }),
  };
