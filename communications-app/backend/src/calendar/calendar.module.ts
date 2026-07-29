// src/calendar/calendar.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Channel,
  ChannelSchema,
} from '../communication/channels/channels-catalogue/schemas/channel-catalog.schema';
import {
  Provider,
  ProviderSchema,
} from '../communication/channels/providers/schemas/provider.schema';
import {
  CompanyChannelProvider,
  CompanyChannelProviderSchema,
} from '../communication/channels/company-channel-providers/schemas/company-channel-provider.schema';

import { CalendarImplementationModule } from './factory/calendar-implementation.module';
import { ChannelsRuntimeModule } from '../communication/channels/runtime/channels-runtime.module';
import { ProviderCredentialsModule } from '../communication/channels/provider-credentials/provider-credentials.module';
import { CompanyChannelProvidersModule } from '../communication/channels/company-channel-providers/company-channel-providers.module';

import { CalendarController } from './controllers/calendar.controller';
import { CalendarService } from './services/calendar.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Channel.name, schema: ChannelSchema },
      { name: Provider.name, schema: ProviderSchema },
      {
        name: CompanyChannelProvider.name,
        schema: CompanyChannelProviderSchema,
      },
    ]),
    CalendarImplementationModule,
    ChannelsRuntimeModule,
    ProviderCredentialsModule,
    CompanyChannelProvidersModule,
  ],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
