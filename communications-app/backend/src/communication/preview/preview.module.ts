import { Module } from '@nestjs/common';

import { PreviewController } from './preview.controller';
import { PreviewService } from './preview.service';
import { CommunicationApiKeyGuard } from '../common/guards/communication-api-key.guard';

import { TemplateEngineModule } from '../common/template-engine/template-engine.module';
import { SourceOfTruthModule } from '../common/source-of-truth/source-of-truth.module';
import { GeneratorModule } from '../../files/generator/generator.module';
import { ReportModule } from '../../files/reports/report.module';

@Module({
  imports: [
    TemplateEngineModule,
    SourceOfTruthModule,
    GeneratorModule,
    ReportModule,
  ],
  controllers: [PreviewController],
  providers: [PreviewService, CommunicationApiKeyGuard],
})
export class PreviewModule {}
