// src/channels/implementation/email/smtp/smtp-credentials.contract.ts

import nodemailer from 'nodemailer';
import type { ContractSpec } from '../../shared/credentials.types';
import {
  bool,
  isEmailLike,
  num,
  pick,
  requireField,
  strTrim,
} from '../../shared/credentials.utils';
import { CredentialsValidationError } from '../../shared/credentials.errors';
import type { SmtpCredentials } from './smtp-email.types';

const ALLOWED: (keyof SmtpCredentials)[] = [
  'host',
  'port',
  'secure',
  'user',
  'pass',
  'fromEmail',
  'fromName',
  'replyTo',
  'tlsRejectUnauthorized',
  'providerKey',
];

export const SmtpCredentialsContract: ContractSpec<SmtpCredentials> = {
  channelKey: 'email',
  connectionType: 'smtp',

  normalize(input) {
    const c: any = input ?? {};

    // legacy / alternos
    const user = strTrim(c.user ?? c.username ?? c.MAIL_USER);
    const pass = String(c.pass ?? c.password ?? c.MAIL_PASS ?? '');

    const host = strTrim(c.host ?? c.SMTP_HOST);

    // ✅ Dejamos SIEMPRE un port definido (default 587)
    const port = num(c.port ?? c.SMTP_PORT) ?? 587;

    // ✅ Dejamos SIEMPRE secure definido
    const secure = bool(c.secure) ?? port === 465;

    const fromEmail = strTrim(c.fromEmail ?? c.MAIL_FROM_EMAIL) || undefined;
    const fromName = strTrim(c.fromName ?? c.MAIL_FROM_NAME) || undefined;
    const replyTo = strTrim(c.replyTo) || undefined;

    const tlsRejectUnauthorized = bool(c.tlsRejectUnauthorized) ?? true;
    const providerKey = strTrim(c.providerKey) || undefined;

    const normalized: SmtpCredentials = {
      host,
      port,
      secure,
      user,
      pass,
      fromEmail,
      fromName,
      replyTo,
      tlsRejectUnauthorized,
      providerKey,
    };

    // ✅ whitelist (evita guardar basura)
    return {
      value: pick<SmtpCredentials>(normalized, ALLOWED) as SmtpCredentials,
    };
  },

  validate(value) {
    requireField(value.host, 'host');
    requireField(value.user, 'user');
    requireField(value.pass, 'pass');

    if (!value.port || value.port < 1 || value.port > 65535) {
      throw new CredentialsValidationError('Invalid port', 'port');
    }

    if (value.fromEmail && !isEmailLike(value.fromEmail)) {
      throw new CredentialsValidationError('Invalid fromEmail', 'fromEmail');
    }

    if (value.replyTo && !isEmailLike(value.replyTo)) {
      throw new CredentialsValidationError('Invalid replyTo', 'replyTo');
    }
  },

  async verify(value) {
    try {
      const transporter = nodemailer.createTransport({
        host: value.host,
        port: value.port,
        secure: value.secure,
        auth: { user: value.user, pass: value.pass },
        tls: { rejectUnauthorized: value.tlsRejectUnauthorized ?? true },
      });

      await transporter.verify();
      return { ok: true, message: 'SMTP credentials are valid' };
    } catch (err: any) {
      return { ok: false, message: err?.message ?? 'SMTP verify failed' };
    }
  },
};
