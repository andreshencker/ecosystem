// src/channels/implementation/email/api_key/mailgun-email.channel.ts

import { Injectable, Logger } from '@nestjs/common';

import type { IEmailChannel } from '../email-channel.interface';
import type { VerifyResult } from '../../shared/credentials.types';

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
    /**
     * ⚠️ Envío real NO implementado aquí todavía.
     * La estandarización/validación sí queda lista.
     */
    try {
      const normalized = MailgunCredentialsContract.normalize(
        payload.credentials,
      );
      MailgunCredentialsContract.validate(normalized.value);

      const creds = normalized.value as MailgunEmailCredentials;
      const providerKey = payload.providerKey ?? creds.providerKey ?? 'mailgun';

      return {
        channel: 'EMAIL',
        provider: String(providerKey),
        success: false,
        error: 'Mailgun email send not implemented yet (contract OK)',
      };
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
