import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import { Provider, ProviderSchema } from './schemas/provider.schema';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';

import {
  Channel,
  ChannelSchema,
} from '../channels-catalogue/schemas/channel-catalog.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Provider.name, schema: ProviderSchema },
      { name: Channel.name, schema: ChannelSchema }, // ✅ necesario
    ]),
  ],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
