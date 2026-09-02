// src/channels/implementation/email/api_key/mailgun-credentials.contract.ts

import type { ContractSpec } from '../../shared/credentials.types';
import {
  isEmailLike,
  pick,
  requireField,
  strTrim,
} from '../../shared/credentials.utils';
import { CredentialsValidationError } from '../../shared/credentials.errors';
import type { MailgunEmailCredentials } from './mailgun-email.types';

const ALLOWED: (keyof MailgunEmailCredentials)[] = [
  'providerKey',
  'apiKey',
  'domain',
  'baseUrl',
  'fromEmail',
  'fromName',
  'replyTo',
];

function normalizeBaseUrl(v: any): string | undefined {
  const s = strTrim(v);
  if (!s) return undefined;
  // no forzamos URL estricta, pero sí limpiamos trailing slash
  return s.replace(/\/+$/, '');
}

export const MailgunCredentialsContract: ContractSpec<MailgunEmailCredentials> =
  {
    channelKey: 'email',
    connectionType: 'api_key',

    normalize(input) {
      const c: any = input ?? {};

      const apiKey = strTrim(c.apiKey ?? c.MAILGUN_API_KEY ?? c.key);
      const domain = strTrim(c.domain ?? c.MAILGUN_DOMAIN ?? c.MG_DOMAIN);

      const baseUrl = normalizeBaseUrl(c.baseUrl ?? c.MAILGUN_BASE_URL);

      const providerKey =
        strTrim(c.providerKey ?? c.PROVIDER_KEY ?? 'mailgun') || 'mailgun';

      const fromEmail =
        strTrim(c.fromEmail ?? c.FROM_EMAIL ?? c.MAIL_FROM_EMAIL) || undefined;
      const fromName =
        strTrim(c.fromName ?? c.FROM_NAME ?? c.MAIL_FROM_NAME) || undefined;
      const replyTo = strTrim(c.replyTo ?? c.REPLY_TO) || undefined;

      const normalized: MailgunEmailCredentials = {
        providerKey,
        apiKey,
        domain,
        baseUrl,
        fromEmail,
        fromName,
        replyTo,
      };

      return {
        value: pick<MailgunEmailCredentials>(
          normalized,
          ALLOWED,
        ) as MailgunEmailCredentials,
      };
    },

    validate(value) {
      requireField(value.apiKey, 'apiKey');
      requireField(value.domain, 'domain');

      // domain mínimo (no regex agresivo)
      const d = strTrim(value.domain);
      if (d && !d.includes('.')) {
        throw new CredentialsValidationError('Invalid domain', 'domain');
      }

      if (value.fromEmail && !isEmailLike(value.fromEmail)) {
        throw new CredentialsValidationError('Invalid fromEmail', 'fromEmail');
      }
      if (value.replyTo && !isEmailLike(value.replyTo)) {
        throw new CredentialsValidationError('Invalid replyTo', 'replyTo');
      }
    },

    // verify: opcional (podrías llamar endpoint de domains o events)
  };
