// src/common/template-engine/template-engine.module.ts
import { Module } from '@nestjs/common';

import { TemplateRendererService } from './template-renderer.service';
import { TemplateComposerService } from './template-composer.service';

@Module({
  providers: [TemplateRendererService, TemplateComposerService],
  exports: [TemplateRendererService, TemplateComposerService],
})
export class TemplateEngineModule {}
