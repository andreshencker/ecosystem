// src/channels/implementation/email/api_key/mailgun-email.channel.ts

import * as https from 'https';
import { Injectable, Logger } from '@nestjs/common';

import type { IEmailChannel } from '../email-channel.interface';
import type { VerifyResult } from '../../shared/credentials.types';
import { emailSendTimeout } from '../../shared/channel-timeout.util';

import type { SendEmailDto } from '../../../../notifications/dto/send-email.dto';
import type { NotificationResultDto } from '../../../../notifications/dto/notification-result.dto';

import { MailgunCredentialsContract } from './mailgun-credentials.contract';
import type { MailgunEmailCredentials } from './mailgun-email.types';

@Injectable()
export class MailgunEmailChannel implements IEmailChannel {
  private readonly logger = new Logger(MailgunEmailChannel.name);

  async verifyCredentials(
    credentials: Record<string, any>,
  ): Promise<VerifyResult> {
    try {
      const normalized = MailgunCredentialsContract.normalize(credentials);
      MailgunCredentialsContract.validate(normalized.value);

      if (!MailgunCredentialsContract.verify) {
        return {
          ok: true,
          message:
            'Mailgun API credentials validated (no remote verify configured)',
        };
      }

      return await MailgunCredentialsContract.verify(normalized.value);
    } catch (err: any) {
      this.logger.error(`❌ Mailgun verify failed: ${err?.message}`);
      return { ok: false, message: err?.message ?? 'Mailgun verify failed' };
    }
  }

  async sendEmail(
    payload: SendEmailDto & {
      credentials: Record<string, any>;
      providerKey?: string;
    },
  ): Promise<NotificationResultDto> {
    try {
      const normalized = MailgunCredentialsContract.normalize(
        payload.credentials,
      );
      MailgunCredentialsContract.validate(normalized.value);

      const creds = normalized.value;
      const providerKey = payload.providerKey ?? creds.providerKey ?? 'mailgun';

      const from =
        payload.from ??
        (creds.fromName && creds.fromEmail
          ? `${creds.fromName} <${creds.fromEmail}>`
          : (creds.fromEmail ?? `noreply@${creds.domain}`));

      const pairs: string[] = [
        `from=${encodeURIComponent(from)}`,
        `to=${encodeURIComponent(payload.to)}`,
        `subject=${encodeURIComponent(payload.subject)}`,
        `html=${encodeURIComponent(payload.html)}`,
      ];
      if (creds.replyTo) {
        pairs.push(`h:Reply-To=${encodeURIComponent(creds.replyTo)}`);
      }
      const body = pairs.join('&');

      const auth = Buffer.from(`api:${creds.apiKey}`).toString('base64');
      const baseUrl = creds.baseUrl ?? 'https://api.mailgun.net';
      const hostname = baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const path = `/v3/${encodeURIComponent(creds.domain)}/messages`;

      const sendOp = new Promise<NotificationResultDto>((resolve) => {
        const req = https.request(
          {
            hostname,
            path,
            method: 'POST',
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              'Content-Length': Buffer.byteLength(body),
            },
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              if (res.statusCode === 200) {
                resolve({
                  channel: 'EMAIL',
                  provider: String(providerKey),
                  success: true,
                  error: null,
                });
              } else {
                resolve({
                  channel: 'EMAIL',
                  provider: String(providerKey),
                  success: false,
                  error: `Mailgun HTTP ${res.statusCode}: ${data.slice(0, 300)}`,
                });
              }
            });
          },
        );
        req.on('error', (err) =>
          resolve({
            channel: 'EMAIL',
            provider: String(providerKey),
            success: false,
            error: err.message,
          }),
        );
        req.write(body);
        req.end();
      });

      return await Promise.race([
        sendOp,
        emailSendTimeout(String(providerKey)),
      ]);
    } catch (err: any) {
      this.logger.error(
        `❌ Mailgun error preparing send to ${payload.to}: ${err?.message}`,
        err?.stack,
      );
      return {
        channel: 'EMAIL',
        provider: payload.providerKey ?? 'mailgun',
        success: false,
        error: err?.message ?? 'Mailgun send failed',
      };
    }
  }
}
