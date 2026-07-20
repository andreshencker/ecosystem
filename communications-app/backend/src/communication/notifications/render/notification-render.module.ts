import { Module } from '@nestjs/common';

import { NotificationRenderService } from './notification-render.service';
import { SourceOfTruthModule } from '../../common/source-of-truth/source-of-truth.module';
import { TemplateEngineModule } from '../../common/template-engine/template-engine.module';

@Module({
  imports: [SourceOfTruthModule, TemplateEngineModule],
  providers: [NotificationRenderService],
  exports: [NotificationRenderService],
})
export class NotificationRenderModule {}
