// src/calendar/contracts/outlook-credentials.contract.ts

import type { ContractSpec } from '../../communication/channels/implementation/shared/credentials.types';
import {
  num,
  pick,
  requireField,
  strTrim,
} from '../../communication/channels/implementation/shared/credentials.utils';
import type { OutlookCalendarCredentials } from '../providers/outlook/outlook-credentials.types';

const ALLOWED: (keyof OutlookCalendarCredentials)[] = [
  'clientId',
  'clientSecret',
  'refreshToken',
  'tenantId',
  'accessToken',
  'expiresAt',
];

const VALID_TENANT_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const OutlookCalendarCredentialsContract: ContractSpec<OutlookCalendarCredentials> = {
  channelKey: 'calendar' as any,
  connectionType: 'oauth',

  normalize(input) {
    const c: any = input ?? {};

    const clientId     = strTrim(c.clientId     ?? c.client_id     ?? c.OUTLOOK_CLIENT_ID    ?? c.AZURE_CLIENT_ID);
    const clientSecret = strTrim(c.clientSecret ?? c.client_secret ?? c.OUTLOOK_CLIENT_SECRET ?? c.AZURE_CLIENT_SECRET);
    const refreshToken = strTrim(c.refreshToken ?? c.refresh_token ?? c.OUTLOOK_REFRESH_TOKEN);
    const tenantId     = strTrim(c.tenantId     ?? c.tenant_id     ?? c.OUTLOOK_TENANT_ID     ?? c.AZURE_TENANT_ID) || 'common';
    const accessToken  = strTrim(c.accessToken  ?? c.access_token  ?? c.OUTLOOK_ACCESS_TOKEN) || undefined;
    const expiresAt    = num(c.expiresAt ?? c.expires_at ?? c.OUTLOOK_TOKEN_EXPIRES_AT);

    const normalized: OutlookCalendarCredentials = {
      clientId,
      clientSecret,
      refreshToken,
      tenantId,
      ...(accessToken !== undefined && { accessToken }),
      ...(expiresAt   !== undefined && { expiresAt  }),
    };

    return { value: pick<OutlookCalendarCredentials>(normalized, ALLOWED) as OutlookCalendarCredentials };
  },

  validate(value) {
    requireField(value.clientId,     'clientId');
    requireField(value.clientSecret, 'clientSecret');
    requireField(value.refreshToken, 'refreshToken');
    requireField(value.tenantId,     'tenantId');

    const tid = value.tenantId;
    const isSpecialTenant = tid === 'common' || tid === 'consumers' || tid === 'organizations';

    if (!isSpecialTenant && !VALID_TENANT_RE.test(tid)) {
      // Warn only — non-GUID tenant identifiers are allowed in some Azure setups.
    }
  },

  async verify(value) {
    // TODO (Phase 2): POST to
    //   https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
    // with grant_type=refresh_token, client_id, client_secret, refresh_token,
    //   scope=https://graph.microsoft.com/.default offline_access
    // A 200 response with { access_token, expires_in } confirms valid credentials.

    // Phase 1: field validation only.
    return {
      ok: true,
      message: 'Outlook Calendar credentials format is valid. Live token exchange pending (Phase 2).',
    };
  },
};
