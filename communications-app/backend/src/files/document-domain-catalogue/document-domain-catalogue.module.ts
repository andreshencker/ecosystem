import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  DocumentDomainCatalogue,
  DocumentDomainCatalogueSchema,
} from './schemas/document-domain-catalogue.schema';
import { DocumentDomainCatalogueService } from './document-domain-catalogue.service';
import { DocumentDomainCatalogueController } from './document-domain-catalogue.controller';

@Module({
  imports: [
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
