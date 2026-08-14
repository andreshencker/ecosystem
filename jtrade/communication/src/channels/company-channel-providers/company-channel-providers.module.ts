import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import {
  CompanyChannelProvider,
  CompanyChannelProviderSchema,
} from './schemas/company-channel-provider.schema';

import { CompanyChannelProvidersService } from './company-channel-providers.service';
import { CompanyChannelProvidersController } from './company-channel-providers.controller';

// ✅ para validaciones
import { Provider, ProviderSchema } from '../providers/schemas/provider.schema';
import {
  Channel,
  ChannelSchema,
} from '../channels-catalogue/schemas/channel-catalog.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      {
        name: CompanyChannelProvider.name,
        schema: CompanyChannelProviderSchema,
      },
      { name: Provider.name, schema: ProviderSchema },
      { name: Channel.name, schema: ChannelSchema },
    ]),
  ],
  controllers: [CompanyChannelProvidersController],
  providers: [CompanyChannelProvidersService],
  exports: [CompanyChannelProvidersService],
})
export class CompanyChannelProvidersModule {}
