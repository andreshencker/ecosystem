// src/files/generator/generator.module.ts
import { Module } from '@nestjs/common';

import { GeneratorService } from './generator.service';
import { RendererRegistry } from './renderers/renderer.registry';

import { PdfRendererService } from './renderers/pdf/pdf-renderer.service';
import { CsvRendererService } from './renderers/csv/csv-renderer.service';
import { XlsxRendererService } from './renderers/xlsx/xlsx-renderer.service';

import { TemplateRendererService } from '../../communication/common/template-engine/template-renderer.service';

@Module({
  providers: [
    GeneratorService,

    // registry + renderers
    RendererRegistry,
    PdfRendererService,
    CsvRendererService,
    XlsxRendererService,

    // ✅ requerido para composeHtml
    TemplateRendererService,
  ],
  exports: [GeneratorService],
})
export class GeneratorModule {}
