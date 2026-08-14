// src/channels/implementation/email/smtp/smtp-email.channel.ts

import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

import type { IEmailChannel } from '../email-channel.interface';
import type { VerifyResult } from '../../shared/credentials.types';

import type { SendEmailDto } from '../../../../notifications/dto/send-email.dto';
import type { NotificationResultDto } from '../../../../notifications/dto/notification-result.dto';

import { SmtpCredentialsContract } from './smtp-credentials.contract';
import type { SmtpCredentials } from './smtp-email.types';

@Injectable()
export class SmtpEmailChannel implements IEmailChannel {
  private readonly logger = new Logger(SmtpEmailChannel.name);

  /**
   * ✅ Verify usando el CONTRACT (single source of truth)
   */
  async verifyCredentials(
    credentials: Record<string, any>,
  ): Promise<VerifyResult> {
    try {
      const normalized = SmtpCredentialsContract.normalize(credentials);
      SmtpCredentialsContract.validate(normalized.value);

      if (!SmtpCredentialsContract.verify) {
        return { ok: true, message: 'No verify() implemented for smtp' };
      }

      return await SmtpCredentialsContract.verify(normalized.value);
    } catch (err: any) {
      // ❌ Nunca loguear pass
      this.logger.error(`❌ SMTP verify failed: ${err?.message}`);
      return { ok: false, message: err?.message ?? 'SMTP verify failed' };
    }
  }

  /**
   * ✅ Envío usando credenciales normalizadas/validadas por el CONTRACT
   * (aunque ya deberían venir limpias desde DB/runtime).
   */
  async sendEmail(
    payload: SendEmailDto & {
      credentials: Record<string, any>;
      providerKey?: string;
    },
  ): Promise<NotificationResultDto> {
    try {
      const normalized = SmtpCredentialsContract.normalize(payload.credentials);
      SmtpCredentialsContract.validate(normalized.value);

      const creds = normalized.value as SmtpCredentials;
      const providerKey = payload.providerKey ?? creds.providerKey ?? 'smtp';

      const transporter = this.createTransporter(creds);

      const attachments =
        payload.attachments?.map((a) => ({
          filename: a.filename,
          content: a.contentBase64,
          encoding: 'base64' as const,
          contentType: a.contentType,
        })) ?? [];

      const from =
        payload.from ??
        (creds.fromName && creds.fromEmail
          ? `"${creds.fromName}" <${creds.fromEmail}>`
          : (creds.fromEmail ?? creds.user));

      await transporter.sendMail({
        from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        replyTo: creds.replyTo,
        attachments: attachments.length ? attachments : undefined,
      });

      return {
        channel: 'EMAIL',
        provider: String(providerKey),
        success: true,
        error: null,
      };
    } catch (err: any) {
      this.logger.error(
        `❌ SMTP error sending to ${payload.to}: ${err?.message}`,
        err?.stack,
      );
      return {
        channel: 'EMAIL',
        provider: payload.providerKey ?? 'smtp',
        success: false,
        error: err?.message ?? 'Unknown SMTP error',
      };
    }
  }

  // ==========================
  // Internal
  // ==========================

  private createTransporter(creds: SmtpCredentials) {
    return nodemailer.createTransport({
      host: creds.host,
      port: creds.port,
      secure: creds.secure,
      auth: { user: creds.user, pass: creds.pass },
      tls: { rejectUnauthorized: creds.tlsRejectUnauthorized ?? true },
    });
  }
}
