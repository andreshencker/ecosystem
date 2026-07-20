// src/files/generator/generator.service.ts
import { Injectable } from '@nestjs/common';

import { RendererRegistry } from './renderers/renderer.registry';
import { ensureFileExtension } from './utils/filename.util';
import { type FileFormat, resolveMimeType } from './utils/mime.util';

import type { GenerateFileDto } from './dto/generate-file.dto';
import type { DownloadFileResult } from './dto/download-file.result';

import { TemplateRendererService } from '../../communication/common/template-engine/template-renderer.service';
import { composeHtml, type ComposeHtmlParams } from './utils/compose-html.util';

@Injectable()
export class GeneratorService {
  constructor(
    private readonly renderers: RendererRegistry,
    private readonly templateRenderer: TemplateRendererService,
  ) {}

  /**
   * ✅ Nuevo: Composer (layout + css + content + vars) vive en Generator
   */
  composeHtml(params: ComposeHtmlParams): string {
    return composeHtml(this.templateRenderer, params);
  }

  /**
   * ✅ Alias: generate() (más claro para Reports)
   * Internamente llama a handle() para no romper compatibilidad.
   */
  async generate(dto: GenerateFileDto): Promise<DownloadFileResult> {
    return this.handle(dto);
  }

  /**
   * ✅ API actual (se mantiene)
   */
  async handle(dto: GenerateFileDto): Promise<DownloadFileResult> {
    const format = dto.format as FileFormat;

    const filename = ensureFileExtension(dto.filename, format);
    const renderer = this.renderers.get(format);

    const buffer = await renderer.render({
      format,
      filename,
      payload: dto.payload ?? {},
      meta: dto.meta ?? {},
    });

    return {
      format,
      filename,
      buffer,
      mimeType: resolveMimeType(format),
    };
  }
}
