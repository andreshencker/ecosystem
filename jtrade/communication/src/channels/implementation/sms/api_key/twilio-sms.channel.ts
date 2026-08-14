// src/channels/implementation/sms/api_key/twilio-sms.channel.ts

import { Injectable, Logger } from '@nestjs/common';
import twilio from 'twilio';

import type { ISmsChannel, SmsSendResult } from '../sms-channel.interface';
import type { VerifyResult } from '../../shared/credentials.types';
import type { SendSmsDto } from '../../../../notifications/dto/send-sms.dto';

import { TwilioCredentialsContract } from './twilio-credentials.contract';
import type { TwilioSmsCredentials } from './twilio-sms.types';

@Injectable()
export class TwilioSmsChannel implements ISmsChannel {
  private readonly logger = new Logger(TwilioSmsChannel.name);

  async verifyCredentials(
    credentials: Record<string, any>,
  ): Promise<VerifyResult> {
    try {
      const normalized = TwilioCredentialsContract.normalize(credentials);
      TwilioCredentialsContract.validate(normalized.value);

      if (!TwilioCredentialsContract.verify) {
        return {
          ok: true,
          message: 'Twilio credentials validated (no remote verify configured)',
        };
      }

      return await TwilioCredentialsContract.verify(normalized.value);
    } catch (err: any) {
      this.logger.error(`❌ Twilio verify failed: ${err?.message}`);
      return { ok: false, message: err?.message ?? 'Twilio verify failed' };
    }
  }

  async sendSms(
    payload: SendSmsDto & {
      credentials: Record<string, any>;
      providerKey?: string;
    },
  ): Promise<SmsSendResult> {
    try {
      const normalized = TwilioCredentialsContract.normalize(
        payload.credentials,
      );
      TwilioCredentialsContract.validate(normalized.value);

      const creds = normalized.value as TwilioSmsCredentials;
      const providerKey = payload.providerKey ?? creds.providerKey ?? 'twilio';

      const client = twilio(creds.accountSid, creds.authToken);

      await client.messages.create({
        from: creds.fromNumber,
        to: payload.to,
        body: payload.text,
      });

      return { success: true, provider: String(providerKey), error: null };
    } catch (err: any) {
      // ❌ nunca loguear authToken
      this.logger.error(
        `❌ Twilio error sending SMS to ${payload.to}: ${err?.message}`,
        err?.stack,
      );
      return {
        success: false,
        provider: payload.providerKey ?? 'twilio',
        error: err?.message ?? 'Twilio send failed',
      };
    }
  }
}
