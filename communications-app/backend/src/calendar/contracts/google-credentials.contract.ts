// src/calendar/contracts/google-credentials.contract.ts

import type { ContractSpec } from '../../communication/channels/implementation/shared/credentials.types';
import {
  num,
  pick,
  requireField,
  strTrim,
} from '../../communication/channels/implementation/shared/credentials.utils';
import type { GoogleCalendarCredentials } from '../providers/google/google-credentials.types';

const ALLOWED: (keyof GoogleCalendarCredentials)[] = [
  'clientId',
  'clientSecret',
  'refreshToken',
  'accessToken',
  'expiresAt',
];

export const GoogleCalendarCredentialsContract: ContractSpec<GoogleCalendarCredentials> =
  {
    channelKey: 'calendar' as any,
    connectionType: 'oauth',

    normalize(input) {
      const c: any = input ?? {};

      const clientId = strTrim(c.clientId ?? c.client_id ?? c.GOOGLE_CLIENT_ID);
      const clientSecret = strTrim(
        c.clientSecret ?? c.client_secret ?? c.GOOGLE_CLIENT_SECRET,
      );
      const refreshToken = strTrim(
        c.refreshToken ?? c.refresh_token ?? c.GOOGLE_REFRESH_TOKEN,
      );
      const accessToken =
        strTrim(c.accessToken ?? c.access_token ?? c.GOOGLE_ACCESS_TOKEN) ||
        undefined;
      const expiresAt = num(
        c.expiresAt ?? c.expires_at ?? c.GOOGLE_TOKEN_EXPIRES_AT,
      );

      const normalized: GoogleCalendarCredentials = {
        clientId,
        clientSecret,
        refreshToken,
        ...(accessToken !== undefined && { accessToken }),
        ...(expiresAt !== undefined && { expiresAt }),
      };

      return {
        value: pick<GoogleCalendarCredentials>(
          normalized,
          ALLOWED,
        ) as GoogleCalendarCredentials,
      };
    },

    validate(value) {
      requireField(value.clientId, 'clientId');
      requireField(value.clientSecret, 'clientSecret');
      requireField(value.refreshToken, 'refreshToken');

      if (
        value.clientId &&
        !value.clientId.endsWith('.apps.googleusercontent.com')
      ) {
        // Soft warning — do not throw: non-standard client IDs exist in some configs.
        // Not enforced to avoid blocking legitimate OAuth apps with custom client IDs.
      }
    },

    async verify(value) {
      // TODO (Phase 2): POST to https://oauth2.googleapis.com/token with:
      //   grant_type=refresh_token, client_id, client_secret, refresh_token
      // A 200 response with { access_token, expires_in } confirms valid credentials.
      // Cache the new access_token + expiresAt for reuse within the same request.

      // Phase 1: field validation only.
      return {
        ok: true,
        message:
          'Google Calendar credentials format is valid. Live token exchange pending (Phase 2).',
      };
    },
  };
