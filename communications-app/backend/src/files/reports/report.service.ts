// src/files/reports/report.service.ts
import { Injectable } from '@nestjs/common';
import { ReportContentBuilder } from './builders/report-content.builder';
import type { ReportPayload } from './types/report-payload.types';

import { SourceOfTruthService } from '../../communication/common/source-of-truth/source-of-truth.service';
import { GeneratorService } from '../generator/generator.service';

type LayoutRecord = { html: string; css?: string };

@Injectable()
export class ReportService {
  constructor(
    private readonly sot: SourceOfTruthService,
    private readonly contentBuilder: ReportContentBuilder,
    private readonly generator: GeneratorService,
  ) {}

  async buildFinalHtml(params: {
    companyId: string; // ✅ CAMBIO
    report: ReportPayload;
    data?: Record<string, any>;
  }): Promise<string> {
    const { companyId, report, data = {} } = params;

    // ✅ runtime: resolver default theme + default pdf layout
    const { render } = await this.sot.resolveForPdfReport({
      companyId, // ✅ CAMBIO
      data,
    });

    const layout = (render.layout ?? {}) as LayoutRecord;
    if (!layout?.html) {
      throw new Error(
        'Default PDF layout not found for companyId=' + companyId,
      );
    }

    const generatedAtIso =
      report?.meta?.generatedAtIso ?? new Date().toISOString();
    const meta = {
      year:
        Number((generatedAtIso ?? '').slice(0, 4)) || new Date().getFullYear(),
      generatedAtIso,
      generatedAtPretty: this.toPrettyDate(generatedAtIso),
      pageNumber: 1,
      totalPages: 1,
    };

    const contentHtml = this.contentBuilder.build(report, data);

    return this.generator.composeHtml({
      layoutHtml: layout.html,
      layoutCss: layout.css ?? '',
      contentHtml,
      context: { company: render.company ?? {}, theme: render.theme ?? {} },
      data,
      meta,
      leaveDataPlaceholders: false,
    });
  }

  async generatePdf(params: {
    companyId: string; // ✅ CAMBIO
    filename: string;
    report: ReportPayload;
    data?: Record<string, any>;
  }) {
    const html = await this.buildFinalHtml(params);

    return this.generator.generate({
      format: 'pdf',
      filename: params.filename,
      payload: { html },
    });
  }

  private toPrettyDate(iso: string) {
    return iso?.slice(0, 10) ?? '';
  }
}
