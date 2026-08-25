// src/communication/channels/implementation/identity/oauth/google-identity-oauth.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import {
  ProviderCredentials,
  ProviderCredentialsSchema,
} from '../../../provider-credentials/schemas/provider-credentials.schema';

import { CryptoService } from '../../../../common/security/crypto.service';
import { OAuthApplicationsModule } from '../../../oauth-applications/oauth-applications.module';

import { GoogleIdentityOAuthController } from './google-identity-oauth.controller';
import { GoogleIdentityOAuthService } from './google-identity-oauth.service';
import { GoogleIdentityApiClient } from './google-identity-api.client';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: ProviderCredentials.name, schema: ProviderCredentialsSchema },
    ]),
    OAuthApplicationsModule,
  ],
  controllers: [GoogleIdentityOAuthController],
  providers: [GoogleIdentityOAuthService, GoogleIdentityApiClient, CryptoService],
  exports: [GoogleIdentityOAuthService, GoogleIdentityApiClient],
})
export class GoogleIdentityOAuthModule {}
