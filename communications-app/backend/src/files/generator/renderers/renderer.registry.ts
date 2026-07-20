// src/files/generator/renderers/renderer.registry.ts
import { Injectable } from '@nestjs/common';

import type { FileFormat } from '../utils/mime.util';
import type { IFileRenderer } from './renderer.interface';

import { PdfRendererService } from './pdf/pdf-renderer.service';
import { CsvRendererService } from './csv/csv-renderer.service';
import { XlsxRendererService } from './xlsx/xlsx-renderer.service';

@Injectable()
export class RendererRegistry {
  private readonly renderers: IFileRenderer[];

  constructor(
    pdf: PdfRendererService,
    csv: CsvRendererService,
    xlsx: XlsxRendererService,
  ) {
    this.renderers = [pdf, csv, xlsx];
  }

  get(format: FileFormat): IFileRenderer {
    const r = this.renderers.find((x) => x.supports(format));
    if (!r) throw new Error(`No renderer for format "${format}"`);
    return r;
  }
}
