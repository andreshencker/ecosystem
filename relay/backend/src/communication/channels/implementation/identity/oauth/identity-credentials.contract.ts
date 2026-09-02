// src/communication/channels/implementation/identity/oauth/identity-credentials.contract.ts

import type { ContractSpec } from '../../shared/credentials.types';
import { pick, requireField, strTrim } from '../../shared/credentials.utils';
import { CredentialsValidationError } from '../../shared/credentials.errors';
import type { IdentityOAuthCredentials } from './identity-oauth.types';

const ALLOWED: (keyof IdentityOAuthCredentials)[] = [
  'providerKey',
  'clientId',
  'clientSecret',
  'oauthApplicationId',
  'accessToken',
  'refreshToken',
  'expiresAt',
  'scopes',
  'emailAddress',
  'displayName',
  'providerUserId',
];

function toIsoOrUndef(v: any): string | undefined {
  const raw = strTrim(v);
  if (!raw) return undefined;

  const d1 = new Date(raw);
  if (!Number.isNaN(d1.getTime())) return d1.toISOString();

  const n = Number(raw);
  if (Number.isFinite(n)) {
    const ms = n < 10_000_000_000 ? n * 1000 : n;
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

  const parts = s.includes(',') ? s.split(',') : s.split(' ');
  const clean = parts.map((x) => strTrim(x)).filter(Boolean);
  return clean.length ? clean : undefined;
}

export const IdentityCredentialsContract: ContractSpec<IdentityOAuthCredentials> =
  {
    channelKey: 'identity',
    connectionType: 'oauth',

    normalize(input) {
      const c: any = input ?? {};

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
      const scopes = scopesToArray(c.scopes ?? c.SCOPE ?? c.SCOPES);
      const emailAddress =
        strTrim(c.emailAddress ?? c.EMAIL_ADDRESS) || undefined;
      const displayName =
        strTrim(c.displayName ?? c.DISPLAY_NAME) || undefined;
      const providerUserId =
        strTrim(c.providerUserId ?? c.PROVIDER_USER_ID) || undefined;

      const normalized: IdentityOAuthCredentials = {
        providerKey,
        clientId,
        clientSecret,
        oauthApplicationId,
        accessToken,
        refreshToken,
        expiresAt,
        scopes,
        emailAddress,
        displayName,
        providerUserId,
      };

      return {
        value: pick<IdentityOAuthCredentials>(
          normalized,
          ALLOWED,
        ) as IdentityOAuthCredentials,
      };
    },

    validate(value) {
      // Same dual model as the Email channel's Gmail OAuth contract:
      // either bring your own clientId/clientSecret, or reuse an existing
      // OAuthApplication registration.
      if (!value.oauthApplicationId) {
        requireField(value.clientId, 'clientId');
        requireField(value.clientSecret, 'clientSecret');
      }

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
  };
