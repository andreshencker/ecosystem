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
import {
  ProviderCredentials,
  ProviderCredentialsSchema,
} from '../provider-credentials/schemas/provider-credentials.schema';
import {
  Company,
  CompanySchema,
} from '../../company/company-info/schemas/company.schema';
import { RelayTenantContextModule } from '../../../infrastructure/security/relay-tenant-context.module';

@Module({
  imports: [
    ConfigModule,
    RelayTenantContextModule,
    MongooseModule.forFeature([
      {
        name: CompanyChannelProvider.name,
        schema: CompanyChannelProviderSchema,
      },
      { name: Provider.name, schema: ProviderSchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: ProviderCredentials.name, schema: ProviderCredentialsSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
  ],
  controllers: [CompanyChannelProvidersController],
  providers: [CompanyChannelProvidersService],
  exports: [CompanyChannelProvidersService],
})
export class CompanyChannelProvidersModule {}
