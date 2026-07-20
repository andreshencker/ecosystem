// src/channels/provider-credentials/provider-credentials.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import {
  ProviderCredentials,
  ProviderCredentialsSchema,
} from './schemas/provider-credentials.schema';

import {
  CompanyChannelProvider,
  CompanyChannelProviderSchema,
} from '../company-channel-providers/schemas/company-channel-provider.schema';

import { ProviderCredentialsController } from './provider-credentials.controller';
import { ProviderCredentialsService } from './provider-credentials.service';

import { CryptoService } from '../../common/security/crypto.service';

import { ChannelsImplementationFactory } from '../implementation/channels-implementation.factory';

// EMAIL
import { SmtpEmailChannel } from '../implementation/email/smtp/smtp-email.channel';
import { OAuthEmailChannel } from '../implementation/email/oauth/oauth-email.channel';
import { SendGridEmailChannel } from '../implementation/email/api_key/sendgrid-email.channel';
import { MailgunEmailChannel } from '../implementation/email/api_key/mailgun-email.channel';

// SMS
import { TwilioSmsChannel } from '../implementation/sms/api_key/twilio-sms.channel';
import { OAuthSmsChannel } from '../implementation/sms/oauth/oauth-sms.channel';

// STORAGE
import { S3StorageChannel } from '../implementation/storage/access_keys/s3-storage.channel';
import { S3IamRoleStorageChannel } from '../implementation/storage/iam_role/s3-iam-role-storage.channel';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      {
        name: ProviderCredentials.name,
        schema: ProviderCredentialsSchema,
      },
      {
        name: CompanyChannelProvider.name,
        schema: CompanyChannelProviderSchema,
      },
    ]),
  ],
  controllers: [ProviderCredentialsController],
  providers: [
    ProviderCredentialsService,
    CryptoService,

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
  exports: [ProviderCredentialsService],
})
export class ProviderCredentialsModule {}
