// src/channels/channels-catalogue/channels-catalogue.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Channel, ChannelSchema } from './schemas/channel-catalog.schema';
import { ChannelsCatalogService } from './channels-catalog.service';
import { ChannelsCatalogController } from './channels-catalog.controller';
import { CatalogBootstrapService } from './catalog-bootstrap.service';
import {
  Provider,
  ProviderSchema,
} from '../providers/schemas/provider.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Channel.name,   schema: ChannelSchema   },
      { name: Provider.name,  schema: ProviderSchema  },
    ]),
  ],
  controllers: [ChannelsCatalogController],
  providers: [ChannelsCatalogService, CatalogBootstrapService],
  exports: [ChannelsCatalogService],
})
export class ChannelsCatalogModule {}
