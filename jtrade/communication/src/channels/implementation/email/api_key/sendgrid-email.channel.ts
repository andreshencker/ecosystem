// src/channels/implementation/email/api_key/sendgrid-email.channel.ts

import { Injectable, Logger } from '@nestjs/common';

import type { IEmailChannel } from '../email-channel.interface';
import type { VerifyResult } from '../../shared/credentials.types';

import type { SendEmailDto } from '../../../../notifications/dto/send-email.dto';
import type { NotificationResultDto } from '../../../../notifications/dto/notification-result.dto';

import { SendGridCredentialsContract } from './sendgrid-credentials.contract';
import type { SendGridEmailCredentials } from './sendgrid-email.types';

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
    /**
     * ⚠️ Envío real NO implementado aquí todavía.
     * La estandarización/validación sí queda lista.
     */
    try {
      const normalized = SendGridCredentialsContract.normalize(
        payload.credentials,
      );
      SendGridCredentialsContract.validate(normalized.value);

      const creds = normalized.value as SendGridEmailCredentials;
      const providerKey =
        payload.providerKey ?? creds.providerKey ?? 'sendgrid';

      return {
        channel: 'EMAIL',
        provider: String(providerKey),
        success: false,
        error: 'SendGrid email send not implemented yet (contract OK)',
      };
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
