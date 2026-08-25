// src/channels/implementation/channels-implementation.module.ts
import { Module } from '@nestjs/common';

import { ChannelsImplementationFactory } from './channels-implementation.factory';

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

@Module({
  providers: [
    ChannelsImplementationFactory,

    // EMAIL
    SmtpEmailChannel,
    OAuthEmailChannel,
    SendGridEmailChannel,
    MailgunEmailChannel,

    // SMS
    TwilioSmsChannel,
    OAuthSmsChannel,

    // STORAGE
    S3StorageChannel,
    S3IamRoleStorageChannel,
  ],
  exports: [ChannelsImplementationFactory],
})
export class ChannelsImplementationModule {}
