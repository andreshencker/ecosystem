// src/calendar/contracts/icloud-credentials.contract.ts

import type { ContractSpec } from '../../communication/channels/implementation/shared/credentials.types';
import {
  isEmailLike,
  pick,
  requireField,
  strTrim,
} from '../../communication/channels/implementation/shared/credentials.utils';
import { CredentialsValidationError } from '../../communication/channels/implementation/shared/credentials.errors';
import type { ICloudCredentials } from '../providers/icloud/icloud-credentials.types';

const ALLOWED: (keyof ICloudCredentials)[] = ['appleId', 'appSpecificPassword'];

/**
 * App-Specific Password format emitted by Apple:
 *   xxxx-xxxx-xxxx-xxxx  (16 lowercase alphanumeric chars + 3 hyphens)
 */
const APP_SPECIFIC_PASSWORD_RE =
  /^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/;

export const ICloudCredentialsContract: ContractSpec<ICloudCredentials> = {
  channelKey: 'calendar' as any,
  connectionType: 'app_password',

  normalize(input) {
    const c: any = input ?? {};

    const appleId = strTrim(
      c.appleId ?? c.apple_id ?? c.APPLE_ID ?? c.username,
    ).toLowerCase();

    const appSpecificPassword = strTrim(
      c.appSpecificPassword ??
        c.app_specific_password ??
        c.APP_SPECIFIC_PASSWORD ??
        c.password,
    );

    const normalized: ICloudCredentials = { appleId, appSpecificPassword };

    return {
      value: pick<ICloudCredentials>(normalized, ALLOWED) as ICloudCredentials,
    };
  },

  validate(value) {
    requireField(value.appleId, 'appleId');
    requireField(value.appSpecificPassword, 'appSpecificPassword');

    if (!isEmailLike(value.appleId)) {
      throw new CredentialsValidationError(
        'appleId must be a valid Apple ID email address',
        'appleId',
      );
    }

    if (!APP_SPECIFIC_PASSWORD_RE.test(value.appSpecificPassword)) {
      throw new CredentialsValidationError(
        'appSpecificPassword must be in the format xxxx-xxxx-xxxx-xxxx (generated at appleid.apple.com)',
        'appSpecificPassword',
      );
    }
  },

  async verify(value) {
    // TODO (Phase 2): perform a CalDAV PROPFIND against
    //   https://caldav.icloud.com/{appleId}/calendars/
    // using Basic Auth (appleId + appSpecificPassword) to confirm access.
    // A successful 207 Multi-Status response confirms the credentials are valid.

    // Phase 1: field validation is the only check.
    return {
      ok: true,
      message:
        'iCloud credentials format is valid. Live CalDAV check pending (Phase 2).',
    };
  },
};
