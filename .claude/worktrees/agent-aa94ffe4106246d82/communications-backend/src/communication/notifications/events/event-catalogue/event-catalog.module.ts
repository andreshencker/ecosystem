// src/notifications/events/event-catalogue/event-catalog.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  EventCatalogue,
  EventCatalogueSchema,
} from './schemas/event-catalogue.schema';
import { EventCatalogueService } from './event-catalogue.service';
import { EventCatalogueController } from './event-catalogue.controller';

import {
  DomainCatalogue,
  DomainCatalogueSchema,
} from '../domain-catalogue/schemas/domain-catalogue.schema';

// ✅ Necesarios por populate() en EventCatalogueService
import {
  ProviderCredentials,
  ProviderCredentialsSchema,
} from '../../../channels/provider-credentials/schemas/provider-credentials.schema';

import {
  CompanyChannelProvider,
  CompanyChannelProviderSchema,
} from '../../../channels/company-channel-providers/schemas/company-channel-provider.schema';

// ✅ ESTE es el que te está fallando: model "Provider"
import {
  Provider,
  ProviderSchema,
} from '../../../channels/providers/schemas/provider.schema';

// ✅ Este casi seguro también lo necesitas por populate(channelId)
import {
  Channel,
  ChannelSchema,
} from '../../../channels/channels-catalogue/schemas/channel-catalog.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EventCatalogue.name, schema: EventCatalogueSchema },
      { name: DomainCatalogue.name, schema: DomainCatalogueSchema },

      // ✅ populate chain
      { name: ProviderCredentials.name, schema: ProviderCredentialsSchema },
      {
        name: CompanyChannelProvider.name,
        schema: CompanyChannelProviderSchema,
      },
      { name: Provider.name, schema: ProviderSchema },
      { name: Channel.name, schema: ChannelSchema },
    ]),
  ],
  controllers: [EventCatalogueController],
  providers: [EventCatalogueService],
  exports: [EventCatalogueService],
})
export class EventCatalogueModule {}
