import { Module } from '@nestjs/common';

import { PreviewController } from './preview.controller';
import { PreviewService } from './preview.service';

import { TemplateEngineModule } from '../common/template-engine/template-engine.module';
import { SourceOfTruthModule } from '../common/source-of-truth/source-of-truth.module';
import { GeneratorModule } from '../files/generator/generator.module';
import { ReportModule } from '../files/reports/report.module';

@Module({
  imports: [
    TemplateEngineModule,
    SourceOfTruthModule,
    GeneratorModule,
    ReportModule, // para poder inyectar ReportContentBuilder si no lo expones aparte
  ],
  controllers: [PreviewController],
  providers: [PreviewService],
})
export class PreviewModule {}
