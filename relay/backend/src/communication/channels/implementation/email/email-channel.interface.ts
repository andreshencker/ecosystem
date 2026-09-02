// src/channels/implementation/email/email-channel.interface.ts

import type { VerifyResult } from '../shared/credentials.types';
import type { SendEmailDto } from '../../../notifications/dto/send-email.dto';
import type { NotificationResultDto } from '../../../notifications/dto/notification-result.dto';

export interface IEmailChannel {
  verifyCredentials(credentials: Record<string, any>): Promise<VerifyResult>;

  sendEmail(
    payload: SendEmailDto & {
      credentials: Record<string, any>;
      providerKey?: string;
    },
  ): Promise<NotificationResultDto>;
}
