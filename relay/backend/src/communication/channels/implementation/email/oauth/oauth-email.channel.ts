// src/channels/implementation/email/oauth/oauth-email.channel.ts

import { Injectable, Logger } from '@nestjs/common';

import type { IEmailChannel } from '../email-channel.interface';
import type { VerifyResult } from '../../shared/credentials.types';

import type { SendEmailDto } from '../../../../notifications/dto/send-email.dto';
import type { NotificationResultDto } from '../../../../notifications/dto/notification-result.dto';

import { OAuthEmailCredentialsContract } from './oauth-credentials.contract';
import type { OAuthEmailCredentials } from './oauth-email.types';

@Injectable()
export class OAuthEmailChannel implements IEmailChannel {
  private readonly logger = new Logger(OAuthEmailChannel.name);

  async verifyCredentials(
    credentials: Record<string, any>,
  ): Promise<VerifyResult> {
    try {
      const normalized = OAuthEmailCredentialsContract.normalize(credentials);
      OAuthEmailCredentialsContract.validate(normalized.value);

      if (!OAuthEmailCredentialsContract.verify) {
        // ✅ contrato válido, pero sin verificación remota implementada
        return {
          ok: true,
          message: 'OAuth credentials validated (no remote verify configured)',
        };
      }

      return await OAuthEmailCredentialsContract.verify(normalized.value);
    } catch (err: any) {
      this.logger.error(`❌ OAUTH verify failed: ${err?.message}`);
      return { ok: false, message: err?.message ?? 'OAuth verify failed' };
    }
  }

  async sendEmail(
    payload: SendEmailDto & {
      credentials: Record<string, any>;
      providerKey?: string;
    },
  ): Promise<NotificationResultDto> {
    /**
     * ⚠️ Aquí NO implementamos envío real aún.
     * Porque depende 100% del provider y su SDK/API (Gmail API / Microsoft Graph / etc).
     *
     * Lo importante ahora es:
     * - normalizar + validar con contrato
     * - responder de forma consistente
     */
    try {
      const normalized = OAuthEmailCredentialsContract.normalize(
        payload.credentials,
      );
      OAuthEmailCredentialsContract.validate(normalized.value);

      const creds = normalized.value;
      const providerKey = payload.providerKey ?? creds.providerKey ?? 'oauth';

      return {
        channel: 'EMAIL',
        provider: String(providerKey),
        success: false,
        error:
          'OAuth email send not implemented yet for this provider (contract OK)',
      };
    } catch (err: any) {
      this.logger.error(
        `❌ OAUTH error preparing send to ${payload.to}: ${err?.message}`,
        err?.stack,
      );
      return {
        channel: 'EMAIL',
        provider: payload.providerKey ?? 'oauth',
        success: false,
        error: err?.message ?? 'OAuth email send failed',
      };
    }
  }
}
