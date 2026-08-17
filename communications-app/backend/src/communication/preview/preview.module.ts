import { Module } from '@nestjs/common';

import { PreviewController } from './preview.controller';
import { PreviewService } from './preview.service';

import { TemplateEngineModule } from '../common/template-engine/template-engine.module';
import { SourceOfTruthModule } from '../common/source-of-truth/source-of-truth.module';
import { GeneratorModule } from '../../files/generator/generator.module';
import { ReportModule } from '../../files/reports/report.module';
import { DocumentCatalogueModule } from '../../files/document-catalogue/document-catalogue.module';
import { RelayTenantContextModule } from '../../infrastructure/security/relay-tenant-context.module';
import { LayoutTemplatesModule } from '../notifications/template/layout-templates/layout-templates.module';
import { EventCatalogueModule } from '../notifications/events/event-catalogue/event-catalog.module';

@Module({
  imports: [
    TemplateEngineModule,
    SourceOfTruthModule,
    GeneratorModule,
    ReportModule,
    DocumentCatalogueModule,
    RelayTenantContextModule,
    LayoutTemplatesModule,
    EventCatalogueModule,
  ],
  controllers: [PreviewController],
  providers: [PreviewService],
})
export class PreviewModule {}
