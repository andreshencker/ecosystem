// src/channels/implementation/email/api_key/sendgrid-email.channel.ts

import * as https from 'https';
import { Injectable, Logger } from '@nestjs/common';

import type { IEmailChannel } from '../email-channel.interface';
import type { VerifyResult } from '../../shared/credentials.types';
import { emailSendTimeout } from '../../shared/channel-timeout.util';

import type { SendEmailDto } from '../../../../notifications/dto/send-email.dto';
import type { NotificationResultDto } from '../../../../notifications/dto/notification-result.dto';

import { SendGridCredentialsContract } from './sendgrid-credentials.contract';
import type { SendGridEmailCredentials } from './sendgrid-email.types';

function parseSender(from: string): { email: string; name?: string } {
  const m = /^(.+?)\s*<([^>]+)>$/.exec(from.trim());
  if (m) {
    const name = m[1].replace(/^"|"$/g, '').trim();
    return name ? { email: m[2].trim(), name } : { email: m[2].trim() };
  }
  return { email: from.trim() };
}

@Injectable()
export class SendGridEmailChannel implements IEmailChannel {
  private readonly logger = new Logger(SendGridEmailChannel.name);

  async verifyCredentials(
    credentials: Record<string, any>,
  ): Promise<VerifyResult> {
    try {
      const normalized = SendGridCredentialsContract.normalize(credentials);
      SendGridCredentialsContract.validate(normalized.value);

      if (!SendGridCredentialsContract.verify) {
        return {
          ok: true,
          message: 'SendGrid API key validated (no remote verify configured)',
        };
      }

      return await SendGridCredentialsContract.verify(normalized.value);
    } catch (err: any) {
      this.logger.error(`❌ SendGrid verify failed: ${err?.message}`);
      return { ok: false, message: err?.message ?? 'SendGrid verify failed' };
    }
  }

  async sendEmail(
    payload: SendEmailDto & {
      credentials: Record<string, any>;
      providerKey?: string;
    },
  ): Promise<NotificationResultDto> {
    try {
      const normalized = SendGridCredentialsContract.normalize(
        payload.credentials,
      );
      SendGridCredentialsContract.validate(normalized.value);

      const creds = normalized.value as SendGridEmailCredentials;
      const providerKey =
        payload.providerKey ?? creds.providerKey ?? 'sendgrid';

      const fromObj = payload.from
        ? parseSender(payload.from)
        : { email: creds.fromEmail, name: creds.fromName };

      if (!fromObj.email) {
        return {
          channel: 'EMAIL',
          provider: String(providerKey),
          success: false,
          error: 'SendGrid requires fromEmail in credentials or payload.from',
        };
      }

      const bodyObj: Record<string, any> = {
        personalizations: [{ to: [{ email: payload.to }] }],
        from: fromObj,
        subject: payload.subject,
        content: [{ type: 'text/html', value: payload.html }],
      };

      if (creds.replyTo) bodyObj.reply_to = { email: creds.replyTo };

      if (payload.attachments?.length) {
        bodyObj.attachments = payload.attachments.map((a) => ({
          content: a.contentBase64,
          filename: a.filename,
          type: a.contentType ?? 'application/octet-stream',
          disposition: 'attachment',
        }));
      }

      const body = JSON.stringify(bodyObj);

      const sendOp = new Promise<NotificationResultDto>((resolve) => {
        const req = https.request(
          {
            hostname: 'api.sendgrid.com',
            path: '/v3/mail/send',
            method: 'POST',
            headers: {
              Authorization: `Bearer ${creds.apiKey}`,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(body),
            },
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              if (res.statusCode === 202) {
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
                  error: `SendGrid HTTP ${res.statusCode}: ${data.slice(0, 300)}`,
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

      return await Promise.race([sendOp, emailSendTimeout(String(providerKey))]);
    } catch (err: any) {
      this.logger.error(
        `❌ SendGrid error preparing send to ${payload.to}: ${err?.message}`,
        err?.stack,
      );
      return {
        channel: 'EMAIL',
        provider: payload.providerKey ?? 'sendgrid',
        success: false,
        error: err?.message ?? 'SendGrid send failed',
      };
    }
  }
}
