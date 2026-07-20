import { Injectable } from '@nestjs/common';

import {
  UnsupportedConnectionTypeError,
  UnsupportedProviderKeyError,
} from './shared/credentials.errors';
import { lowerTrim, trimOrUndef } from './shared/credentials.utils';

import type { IEmailChannel } from './email/email-channel.interface';
import type { ISmsChannel } from './sms/sms-channel.interface';
import type { IStorageChannel } from './storage/storage-channel.interface';

// EMAIL
import { SmtpEmailChannel } from './email/smtp/smtp-email.channel';
import { OAuthEmailChannel } from './email/oauth/oauth-email.channel';
import { SendGridEmailChannel } from './email/api_key/sendgrid-email.channel';
import { MailgunEmailChannel } from './email/api_key/mailgun-email.channel';

// SMS
import { TwilioSmsChannel } from './sms/api_key/twilio-sms.channel';
import { OAuthSmsChannel } from './sms/oauth/oauth-sms.channel';

// STORAGE
import { S3StorageChannel } from './storage/access_keys/s3-storage.channel';
import { S3IamRoleStorageChannel } from './storage/iam_role/s3-iam-role-storage.channel';

@Injectable()
export class ChannelsImplementationFactory {
  constructor(
    // EMAIL
    private readonly smtpEmail: SmtpEmailChannel,
    private readonly oauthEmail: OAuthEmailChannel,
    private readonly sendGridEmail: SendGridEmailChannel,
    private readonly mailgunEmail: MailgunEmailChannel,
    // SMS
    private readonly twilioSms: TwilioSmsChannel,
    private readonly oauthSms: OAuthSmsChannel,
    // STORAGE
    private readonly s3AccessKeys: S3StorageChannel,
    private readonly s3IamRole: S3IamRoleStorageChannel,
  ) {}

  // ======================
  // EMAIL
  // ======================
  getEmailChannel(connectionType: string, providerKey?: string): IEmailChannel {
    const ct = lowerTrim(connectionType);

    switch (ct) {
      case 'smtp':
        return this.smtpEmail;

      case 'oauth':
        return this.oauthEmail;

      case 'api_key': {
        const pk = lowerTrim(providerKey);
        if (pk === 'sendgrid') return this.sendGridEmail;
        if (pk === 'mailgun') return this.mailgunEmail;
        throw new UnsupportedProviderKeyError(
          'EMAIL(api_key)',
          providerKey ?? '(missing)',
        );
      }

      default:
        throw new UnsupportedConnectionTypeError('EMAIL', connectionType);
    }
  }

  // ======================
  // SMS
  // ======================
  getSmsChannel(connectionType: string, providerKey?: string): ISmsChannel {
    const ct = lowerTrim(connectionType);

    switch (ct) {
      case 'api_key': {
        const pk = lowerTrim(providerKey);
        // ✅ default provider si no mandan providerKey
        if (!pk || pk === 'twilio') return this.twilioSms;
        throw new UnsupportedProviderKeyError(
          'SMS(api_key)',
          providerKey ?? '(missing)',
        );
      }

      case 'oauth':
        return this.oauthSms;

      default:
        throw new UnsupportedConnectionTypeError('SMS', connectionType);
    }
  }

  // ======================
  // STORAGE
  // ======================
  getStorageChannel(connectionType: string): IStorageChannel {
    const ct = lowerTrim(connectionType);

    switch (ct) {
      case 'access_keys':
        return this.s3AccessKeys;

      case 'iam_role':
        return this.s3IamRole;

      default:
        throw new UnsupportedConnectionTypeError('STORAGE', connectionType);
    }
  }

  // ======================================
  // Helper: providerKey desde credentials
  // ======================================
  pickProviderKeyFromCredentials(
    credentials?: Record<string, any>,
  ): string | undefined {
    return trimOrUndef(credentials?.providerKey ?? credentials?.PROVIDER_KEY);
  }
}
