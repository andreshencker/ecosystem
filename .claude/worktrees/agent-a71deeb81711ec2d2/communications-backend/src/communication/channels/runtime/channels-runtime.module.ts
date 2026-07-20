// src/channels/runtime/channels-runtime.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ChannelsRuntimeResolverService } from './channels-runtime-resolver.service';

import {
  ProviderCredentials,
  ProviderCredentialsSchema,
} from '../provider-credentials/schemas/provider-credentials.schema';

import {
  CompanyChannelProvider,
  CompanyChannelProviderSchema,
} from '../company-channel-providers/schemas/company-channel-provider.schema';

import { CryptoService } from '../../common/security/crypto.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProviderCredentials.name, schema: ProviderCredentialsSchema },
      {
        name: CompanyChannelProvider.name,
        schema: CompanyChannelProviderSchema,
      },
    ]),
  ],
  providers: [ChannelsRuntimeResolverService, CryptoService],
  exports: [ChannelsRuntimeResolverService],
})
export class ChannelsRuntimeModule {}
