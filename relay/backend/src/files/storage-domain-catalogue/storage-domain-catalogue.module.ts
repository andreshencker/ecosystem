import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  StorageDomainCatalogue,
  StorageDomainCatalogueSchema,
} from './schemas/storage-domain-catalogue.schema';
import { StorageDomainCatalogueService } from './storage-domain-catalogue.service';
import { StorageDomainCatalogueController } from './storage-domain-catalogue.controller';
import { RelayTenantContextModule } from '../../infrastructure/security/relay-tenant-context.module';
import { ChannelsRuntimeModule } from '../../communication/channels/runtime/channels-runtime.module';

@Module({
  imports: [
    RelayTenantContextModule,
    ChannelsRuntimeModule,
    MongooseModule.forFeature([
      {
        name: StorageDomainCatalogue.name,
        schema: StorageDomainCatalogueSchema,
      },
    ]),
  ],
  controllers: [StorageDomainCatalogueController],
  providers: [StorageDomainCatalogueService],
  exports: [StorageDomainCatalogueService],
})
export class StorageDomainCatalogueModule {}
