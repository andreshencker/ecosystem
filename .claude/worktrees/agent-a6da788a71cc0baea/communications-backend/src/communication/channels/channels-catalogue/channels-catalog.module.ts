// src/channels/channels-catalogue/channels-catalogue.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Channel, ChannelSchema } from './schemas/channel-catalog.schema';
import { ChannelsCatalogService } from './channels-catalog.service';
import { ChannelsCatalogController } from './channels-catalog.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Channel.name, schema: ChannelSchema }]),
  ],
  controllers: [ChannelsCatalogController],
  providers: [ChannelsCatalogService],
  exports: [ChannelsCatalogService],
})
export class ChannelsCatalogModule {}
