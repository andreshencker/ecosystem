// src/channels/implementation/email/api_key/sendgrid-credentials.contract.ts

import type { ContractSpec } from '../../shared/credentials.types';
import {
  isEmailLike,
  pick,
  requireField,
  strTrim,
} from '../../shared/credentials.utils';
import { CredentialsValidationError } from '../../shared/credentials.errors';
import type { SendGridEmailCredentials } from './sendgrid-email.types';

const ALLOWED: (keyof SendGridEmailCredentials)[] = [
  'providerKey',
  'apiKey',
  'fromEmail',
  'fromName',
  'replyTo',
];

export const SendGridCredentialsContract: ContractSpec<SendGridEmailCredentials> =
  {
    channelKey: 'email',
    connectionType: 'api_key',

    normalize(input) {
      const c: any = input ?? {};

      const apiKey = strTrim(
        c.apiKey ?? c.SENDGRID_API_KEY ?? c.SG_API_KEY ?? c.key,
      );
      const providerKey =
        strTrim(c.providerKey ?? c.PROVIDER_KEY ?? 'sendgrid') || 'sendgrid';

      const fromEmail =
        strTrim(c.fromEmail ?? c.FROM_EMAIL ?? c.MAIL_FROM_EMAIL) || undefined;
      const fromName =
        strTrim(c.fromName ?? c.FROM_NAME ?? c.MAIL_FROM_NAME) || undefined;
      const replyTo = strTrim(c.replyTo ?? c.REPLY_TO) || undefined;

      const normalized: SendGridEmailCredentials = {
        providerKey,
        apiKey,
        fromEmail,
        fromName,
        replyTo,
      };

      return {
        value: pick<SendGridEmailCredentials>(
          normalized,
          ALLOWED,
        ) as SendGridEmailCredentials,
      };
    },

    validate(value) {
      requireField(value.apiKey, 'apiKey');

      // fromEmail si viene debe ser válido
      if (value.fromEmail && !isEmailLike(value.fromEmail)) {
        throw new CredentialsValidationError('Invalid fromEmail', 'fromEmail');
      }
      if (value.replyTo && !isEmailLike(value.replyTo)) {
        throw new CredentialsValidationError('Invalid replyTo', 'replyTo');
      }
    },

    // verify: opcional (requiere SDK/call real). Lo dejamos sin red por ahora.
  };
