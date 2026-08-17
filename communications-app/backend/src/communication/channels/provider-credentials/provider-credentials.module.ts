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

import {
  Company,
  CompanySchema,
} from '../../company/company-info/schemas/company.schema';
import {
  User,
  UserSchema,
} from '../../../ecosystem/identity/schemas/ecosystem-user.schema';

import { ProviderCredentialsController } from './provider-credentials.controller';
import { ProviderCredentialsService } from './provider-credentials.service';

import { CryptoService } from '../../common/security/crypto.service';
import { NotificationModule } from '../../notifications/notification.module';

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

// CALENDAR
import { CalendarImplementationModule } from '../../../calendar/factory/calendar-implementation.module';
import { ProviderResourcesOrganizationMigration } from '../../../ecosystem/migrations/provider-resources-organization.migration';
import { RelayTenantContextModule } from '../../../infrastructure/security/relay-tenant-context.module';

@Module({
  imports: [
    ConfigModule,
    RelayTenantContextModule,
    MongooseModule.forFeature([
      { name: ProviderCredentials.name, schema: ProviderCredentialsSchema },
      {
        name: CompanyChannelProvider.name,
        schema: CompanyChannelProviderSchema,
      },
      { name: Company.name, schema: CompanySchema },
      { name: User.name, schema: UserSchema },
    ]),
    NotificationModule,
    CalendarImplementationModule,
  ],
  controllers: [ProviderCredentialsController],
  providers: [
    ProviderCredentialsService,
    ProviderResourcesOrganizationMigration,
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
