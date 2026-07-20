// src/channels/implementation/email/oauth/oauth-credentials.contract.ts

import type { ContractSpec } from '../../shared/credentials.types';
import { pick, requireField, strTrim } from '../../shared/credentials.utils';
import { CredentialsValidationError } from '../../shared/credentials.errors';
import type { OAuthEmailCredentials } from './oauth-email.types';

const ALLOWED: (keyof OAuthEmailCredentials)[] = [
  'providerKey',
  'accessToken',
  'refreshToken',
  'expiresAt',
  'tenantId',
  'scopes',
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
      const accessToken = strTrim(c.accessToken ?? c.ACCESS_TOKEN ?? c.token);
      const refreshToken =
        strTrim(c.refreshToken ?? c.REFRESH_TOKEN) || undefined;

      const providerKey = strTrim(c.providerKey ?? c.PROVIDER_KEY) || undefined;

      const expiresAt = toIsoOrUndef(
        c.expiresAt ?? c.EXPIRES_AT ?? c.expiry ?? c.expires_in,
      );

      const tenantId = strTrim(c.tenantId ?? c.TENANT_ID) || undefined;
      const scopes = scopesToArray(c.scopes ?? c.SCOPE ?? c.SCOPES);

      const normalized: OAuthEmailCredentials = {
        providerKey,
        accessToken,
        refreshToken,
        expiresAt,
        tenantId,
        scopes,
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
      requireField(value.accessToken, 'accessToken');

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
