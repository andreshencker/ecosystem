// src/channels/implementation/sms/oauth/oauth-credentials.contract.ts

import type { ContractSpec } from '../../shared/credentials.types';
import { pick, requireField, strTrim } from '../../shared/credentials.utils';
import type { OAuthSmsCredentials } from './oauth-sms.types';

const ALLOWED: (keyof OAuthSmsCredentials)[] = [
  'providerKey',
  'accessToken',
  'refreshToken',
  'tokenType',
  'expiresAt',
  'accountId',
];

function isoOrUndef(v: any): string | undefined {
  const s = strTrim(v);
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.toISOString() : undefined;
}

export const OAuthSmsCredentialsContract: ContractSpec<OAuthSmsCredentials> = {
  channelKey: 'sms',
  connectionType: 'oauth',

  normalize(input) {
    const c: any = input ?? {};

    // soportar legacy keys
    const accessToken = strTrim(c.accessToken ?? c.ACCESS_TOKEN ?? c.token);
    const refreshToken =
      strTrim(c.refreshToken ?? c.REFRESH_TOKEN) || undefined;

    const tokenTypeRaw = strTrim(c.tokenType ?? c.TOKEN_TYPE) || 'Bearer';
    const tokenType = tokenTypeRaw || 'Bearer';

    const expiresAt = isoOrUndef(
      c.expiresAt ?? c.EXPIRES_AT ?? c.expiry ?? c.expires,
    );
    const accountId =
      strTrim(c.accountId ?? c.ACCOUNT_ID ?? c.tenantId ?? c.projectId) ||
      undefined;

    const providerKey = strTrim(c.providerKey ?? c.PROVIDER_KEY) || undefined;

    const normalized: OAuthSmsCredentials = {
      providerKey,
      accessToken,
      refreshToken,
      tokenType,
      expiresAt,
      accountId,
    };

    return {
      value: pick<OAuthSmsCredentials>(
        normalized,
        ALLOWED,
      ) as OAuthSmsCredentials,
    };
  },

  validate(value) {
    requireField(value.accessToken, 'accessToken');

    if (value.expiresAt) {
      const t = new Date(value.expiresAt).getTime();
      if (!Number.isFinite(t)) {
        throw new Error('expiresAt must be a valid ISO date string');
      }
    }
  },

  // verify: opcional y depende del proveedor (normalmente un endpoint /me o /account)
};
