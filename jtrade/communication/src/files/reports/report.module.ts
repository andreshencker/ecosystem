// src/files/reports/report.module.ts
import { Module } from '@nestjs/common';

import { GeneratorModule } from '../generator/generator.module';

// ✅ Ajusta esta ruta al módulo real que exporta TemplateComposerService
import { TemplateEngineModule } from '../../common/template-engine/template-engine.module';

// ✅ Ajusta esta ruta al módulo real que exporta SourceOfTruthService
import { SourceOfTruthModule } from '../../common/source-of-truth/source-of-truth.module';

import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { ReportContentBuilder } from './builders/report-content.builder';

@Module({
  imports: [GeneratorModule, TemplateEngineModule, SourceOfTruthModule],
  controllers: [ReportController],
  providers: [ReportService, ReportContentBuilder],
  exports: [ReportService, ReportContentBuilder],
})
export class ReportModule {}
