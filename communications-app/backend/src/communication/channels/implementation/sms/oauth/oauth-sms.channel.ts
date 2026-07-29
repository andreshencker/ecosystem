// src/channels/implementation/sms/oauth/oauth-sms.channel.ts

import { Injectable, Logger } from '@nestjs/common';

import type { ISmsChannel, SmsSendResult } from '../sms-channel.interface';
import type { VerifyResult } from '../../shared/credentials.types';
import type { SendSmsDto } from '../../../../notifications/dto/send-sms.dto';

import { OAuthSmsCredentialsContract } from './oauth-credentials.contract';
import type { OAuthSmsCredentials } from './oauth-sms.types';

/**
 * ⚠️ Este canal es un "placeholder" genérico:
 * - El envío real depende del provider (Twilio/Vonage/MessageBird/etc) y su API.
 * - Aquí solo garantizamos: normalize + validate + contrato limpio
 * - Y dejamos un error claro si alguien intenta usarlo sin implementación.
 */
@Injectable()
export class OAuthSmsChannel implements ISmsChannel {
  private readonly logger = new Logger(OAuthSmsChannel.name);

  async verifyCredentials(
    credentials: Record<string, any>,
  ): Promise<VerifyResult> {
    try {
      const normalized = OAuthSmsCredentialsContract.normalize(credentials);
      OAuthSmsCredentialsContract.validate(normalized.value);

      if (!OAuthSmsCredentialsContract.verify) {
        return {
          ok: true,
          message:
            'OAuth SMS credentials validated (no remote verify configured)',
        };
      }

      return await OAuthSmsCredentialsContract.verify(normalized.value);
    } catch (err: any) {
      this.logger.error(`❌ OAuth SMS verify failed: ${err?.message}`);
      return { ok: false, message: err?.message ?? 'OAuth SMS verify failed' };
    }
  }

  async sendSms(
    payload: SendSmsDto & {
      credentials: Record<string, any>;
      providerKey?: string;
    },
  ): Promise<SmsSendResult> {
    try {
      const normalized = OAuthSmsCredentialsContract.normalize(
        payload.credentials,
      );
      OAuthSmsCredentialsContract.validate(normalized.value);

      const creds = normalized.value;
      const providerKey = payload.providerKey ?? creds.providerKey ?? 'oauth';

      // Aquí NO enviamos realmente porque depende del provider.
      // Devolvemos error explícito para que no "falle silencioso".
      return {
        success: false,
        provider: String(providerKey),
        error:
          'OAuth SMS send is not implemented yet for this provider. Implement provider-specific client in OAuthSmsChannel.',
      };
    } catch (err: any) {
      this.logger.error(`❌ OAuth SMS send failed: ${err?.message}`);
      return {
        success: false,
        provider: payload.providerKey ?? 'oauth',
        error: err?.message ?? 'OAuth SMS send failed',
      };
    }
  }
}
