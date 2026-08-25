import { Module } from '@nestjs/common';

import { GeneratorModule } from '../generator/generator.module';
import { TemplateEngineModule } from '../../communication/common/template-engine/template-engine.module';
import { SourceOfTruthModule } from '../../communication/common/source-of-truth/source-of-truth.module';
import { RelayTenantContextModule } from '../../infrastructure/security/relay-tenant-context.module';

import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { ReportContentBuilder } from './builders/report-content.builder';

@Module({
  imports: [
    GeneratorModule,
    TemplateEngineModule,
    SourceOfTruthModule,
    RelayTenantContextModule,
  ],
  controllers: [ReportController],
  providers: [ReportService, ReportContentBuilder],
  exports: [ReportService, ReportContentBuilder],
})
export class ReportModule {}
