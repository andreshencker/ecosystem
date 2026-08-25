// src/channels/runtime/channels-runtime.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ChannelsRuntimeResolverService } from './channels-runtime-resolver.service';

import {
  Channel,
  ChannelSchema,
} from '../channels-catalogue/schemas/channel-catalog.schema';
import { Provider, ProviderSchema } from '../providers/schemas/provider.schema';
import {
  CompanyChannelProvider,
  CompanyChannelProviderSchema,
} from '../company-channel-providers/schemas/company-channel-provider.schema';
import {
  ProviderCredentials,
  ProviderCredentialsSchema,
} from '../provider-credentials/schemas/provider-credentials.schema';

import { CryptoService } from '../../common/security/crypto.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      // Channel and Provider catalogues — needed for resolveByChannelAndProvider.
      { name: Channel.name, schema: ChannelSchema },
      { name: Provider.name, schema: ProviderSchema },
      // Company configuration — needed by both resolution paths.
      {
        name: CompanyChannelProvider.name,
        schema: CompanyChannelProviderSchema,
      },
      { name: ProviderCredentials.name, schema: ProviderCredentialsSchema },
    ]),
  ],
  providers: [ChannelsRuntimeResolverService, CryptoService],
  exports: [ChannelsRuntimeResolverService],
})
export class ChannelsRuntimeModule {}
