import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  DocumentCatalogue,
  DocumentCatalogueSchema,
} from './schemas/document-catalogue.schema';
import {
  DocumentDomainCatalogue,
  DocumentDomainCatalogueSchema,
} from '../document-domain-catalogue/schemas/document-domain-catalogue.schema';
import { DocumentCatalogueService } from './document-catalogue.service';
import { DocumentCatalogueController } from './document-catalogue.controller';

// DocumentGenerationService and DocumentGenerationController are registered in
// FilesModule because they need GeneratorService and ReportService, which are
// provided by GeneratorModule and ReportModule — both imported only at the
// FilesModule level.

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DocumentCatalogue.name, schema: DocumentCatalogueSchema },
      {
        name: DocumentDomainCatalogue.name,
        schema: DocumentDomainCatalogueSchema,
      },
    ]),
  ],
  controllers: [DocumentCatalogueController],
  providers: [DocumentCatalogueService],
  exports: [DocumentCatalogueService],
})
export class DocumentCatalogueModule {}
