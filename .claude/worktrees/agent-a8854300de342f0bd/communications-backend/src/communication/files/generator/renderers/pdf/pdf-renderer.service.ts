// src/files/generator/renderers/pdf/pdf-renderer.service.ts
import { Injectable } from '@nestjs/common';
import type { IFileRenderer, RenderInput } from '../renderer.interface';
import type { FileFormat } from '../../utils/mime.util';
import { renderHtmlToPdf } from '../../utils/html-to-pdf.util';

@Injectable()
export class PdfRendererService implements IFileRenderer {
  supports(format: FileFormat): boolean {
    return format === 'pdf';
  }

  async render(input: RenderInput): Promise<Buffer> {
    const html = input.payload?.html;
    if (!html || typeof html !== 'string') {
      throw new Error('PDF renderer requires payload.html (string)');
    }
    return renderHtmlToPdf(html);
  }
}
