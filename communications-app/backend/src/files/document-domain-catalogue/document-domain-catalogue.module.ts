import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  DocumentDomainCatalogue,
  DocumentDomainCatalogueSchema,
} from './schemas/document-domain-catalogue.schema';
import { DocumentDomainCatalogueService } from './document-domain-catalogue.service';
import { DocumentDomainCatalogueController } from './document-domain-catalogue.controller';
import { RelayTenantContextModule } from '../../infrastructure/security/relay-tenant-context.module';

@Module({
  imports: [
    RelayTenantContextModule,
    MongooseModule.forFeature([
      {
        name: DocumentDomainCatalogue.name,
        schema: DocumentDomainCatalogueSchema,
      },
    ]),
  ],
  controllers: [DocumentDomainCatalogueController],
  providers: [DocumentDomainCatalogueService],
  exports: [DocumentDomainCatalogueService],
})
export class DocumentDomainCatalogueModule {}
