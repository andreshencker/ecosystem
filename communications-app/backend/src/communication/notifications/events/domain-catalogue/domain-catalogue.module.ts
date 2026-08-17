import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  DomainCatalogue,
  DomainCatalogueSchema,
} from './schemas/domain-catalogue.schema';

import { DomainCatalogueService } from './domain-catalogue.service';
import { DomainCatalogueController } from './domain-catalogue.controller';

import {
  ProviderCredentials,
  ProviderCredentialsSchema,
} from '../../../channels/provider-credentials/schemas/provider-credentials.schema';

import {
  CompanyChannelProvider,
  CompanyChannelProviderSchema,
} from '../../../channels/company-channel-providers/schemas/company-channel-provider.schema';
import { RelayTenantContextModule } from '../../../../infrastructure/security/relay-tenant-context.module';

@Module({
  imports: [
    RelayTenantContextModule,
    MongooseModule.forFeature([
      { name: DomainCatalogue.name, schema: DomainCatalogueSchema },

      { name: ProviderCredentials.name, schema: ProviderCredentialsSchema },

      {
        name: CompanyChannelProvider.name,
        schema: CompanyChannelProviderSchema,
      },
    ]),
  ],
  controllers: [DomainCatalogueController],
  providers: [DomainCatalogueService],
  exports: [DomainCatalogueService],
})
export class DomainCatalogueModule {}
