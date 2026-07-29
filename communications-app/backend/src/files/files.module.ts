import { Module } from '@nestjs/common';

import { FilesController } from './files.controller';
import { GeneratorModule } from './generator/generator.module';
import { ReportModule } from './reports/report.module';
import { MediaModule } from './media/media.module';
import { StorageModule } from './storage/storage.module';
import { DocumentDomainCatalogueModule } from './document-domain-catalogue/document-domain-catalogue.module';
import { DocumentCatalogueModule } from './document-catalogue/document-catalogue.module';
import { DocumentGenerationService } from './document-catalogue/services/document-generation.service';
import { DocumentGenerationController } from './document-catalogue/controllers/document-generation.controller';

// DocumentGenerationService lives here (not inside DocumentCatalogueModule)
// because it needs GeneratorService (GeneratorModule) and ReportService (ReportModule),
// which are only available at this level.  DocumentCatalogueService is available
// because DocumentCatalogueModule exports it.

@Module({
  imports: [
    GeneratorModule,
    ReportModule,
    MediaModule,
    StorageModule,
    DocumentDomainCatalogueModule,
    DocumentCatalogueModule,
  ],
  controllers: [FilesController, DocumentGenerationController],
  providers: [DocumentGenerationService],
})
export class FilesModule {}
