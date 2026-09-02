// src/communication/channels/implementation/email/oauth/gmail-oauth.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import {
  ProviderCredentials,
  ProviderCredentialsSchema,
} from '../../../provider-credentials/schemas/provider-credentials.schema';

import { CryptoService } from '../../../../common/security/crypto.service';
import { OAuthApplicationsModule } from '../../../oauth-applications/oauth-applications.module';

import { GmailOAuthController } from './gmail-oauth.controller';
import { GmailOAuthService } from './gmail-oauth.service';
import { GmailApiClient } from './gmail-api.client';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: ProviderCredentials.name, schema: ProviderCredentialsSchema },
    ]),
    OAuthApplicationsModule,
  ],
  controllers: [GmailOAuthController],
  providers: [GmailOAuthService, GmailApiClient, CryptoService],
  exports: [GmailOAuthService, GmailApiClient],
})
export class GmailOAuthModule {}
