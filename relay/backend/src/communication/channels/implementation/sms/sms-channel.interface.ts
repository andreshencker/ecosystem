// src/channels/implementation/sms/sms-channel.interface.ts

import type { VerifyResult } from '../shared/credentials.types';
import type { SendSmsDto } from '../../../notifications/dto/send-sms.dto';

export type SmsSendResult = {
  success: boolean;
  provider: string;
  error?: string | null;
};

export interface ISmsChannel {
  verifyCredentials(credentials: Record<string, any>): Promise<VerifyResult>;

  sendSms(
    payload: SendSmsDto & {
      credentials: Record<string, any>;
      providerKey?: string;
    },
  ): Promise<SmsSendResult>;
}
