// src/preview/preview.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { TemplateComposerService } from '../common/template-engine/template-composer.service';
import { SourceOfTruthService } from '../common/source-of-truth/source-of-truth.service';
import { GeneratorService } from '../../files/generator/generator.service';
import { ReportContentBuilder } from '../../files/reports/builders/report-content.builder';

import { PreviewLayoutDto } from './dto/preview-layout.dto';
import { PreviewNotificationDto } from './dto/preview-notification.dto';
import { PreviewReportDto } from './dto/preview-report.dto';

@Injectable()
export class PreviewService {
  constructor(
    private readonly sot: SourceOfTruthService,
    private readonly composer: TemplateComposerService,
    private readonly generator: GeneratorService,
    private readonly reportBuilder: ReportContentBuilder,
  ) {}

  // ─────────────────────────────
  // Meta (preview)

  // ─────────────────────────────
  async previewLayoutHtml(dto: PreviewLayoutDto): Promise<string> {
    const layoutContext = await this.sot.resolveLayoutById({
      layoutTemplateId: dto.layoutTemplateId,
    });

    const { layout, company, theme } = layoutContext;

    if (!layout?.html) throw new NotFoundException('Layout HTML not found');

    // Layout preview: no contentHtml (vacío), pero sí inyectamos company/theme/meta
    return this.composer.compose({
      layoutHtml: layout.html,
      layoutCss: layout.css ?? '',
      contentHtml: '', // <- intencional
      context: { company, theme },
      data: {},
      meta: this.buildMeta(),
      // En preview dejamos placeholders data.* para que el usuario vea lo que falta
      leaveDataPlaceholders: true,
    });
  }

  // ─────────────────────────────
  // 1) Layout ONLY (HTML)

  // ─────────────────────────────
  async previewNotificationEmailHtml(
    dto: PreviewNotificationDto,
  ): Promise<string> {
    const mock = dto.mock === true;

    // 1) Layout por ID
    const layoutContext = await this.sot.resolveLayoutById({
      layoutTemplateId: dto.layoutTemplateId,
    });

    const { layout, company, theme } = layoutContext;

    if (!layout?.html) throw new NotFoundException('Layout HTML not found');
    if (layout.templateType !== 'email') {
      throw new BadRequestException('Layout must be of type "email"');
    }

    // 2) Event por ID
    const eventContext = await this.sot.resolveEventById({
      eventCatalogueId: dto.eventCatalogueId,
      templateType: 'email',
    });

    const channel = eventContext.channel;
    if (!channel?.enabled) {
      throw new BadRequestException('Email channel disabled or missing');
    }

    const contentHtml = String(channel.content ?? '').trim();
    if (!contentHtml) throw new BadRequestException('Email content is empty');

    // 3) Data payload (solo si mock=true)
    const payloadData = mock ? (dto.payload?.data ?? {}) : {};

    // 4) Validación requiredVariables SOLO cuando mock=true
    if (mock) {
      const required = Array.isArray(channel.requiredVariables)
        ? channel.requiredVariables
        : [];

      const varsForValidation = { data: payloadData };

      const missing = required.filter((path) => {
        const v = this.getByPath(varsForValidation, path);
        return v === undefined || v === null || v === '';
      });

      if (missing.length) {
        throw new BadRequestException(
          `Missing required variables: ${missing.join(', ')}`,
        );
      }
    }

    // 5) Compose final
    return this.composer.compose({
      layoutHtml: layout.html,
      layoutCss: layout.css ?? '',
      contentHtml,
      context: { company, theme },
      data: payloadData,
      meta: this.buildMeta(),
      // mock=false => deja {{data.xxx}} tal cual
      // mock=true  => renderiza data real
      leaveDataPlaceholders: !mock,
    });
  }

  // ─────────────────────────────
  // 2) Notification EMAIL (HTML)

  // ─────────────────────────────
  async previewReportPdf(dto: PreviewReportDto): Promise<Buffer> {
    const layoutContext = await this.sot.resolveLayoutById({
      layoutTemplateId: dto.layoutTemplateId,
    });

    const { layout, company, theme } = layoutContext;

    if (!layout?.html) throw new NotFoundException('Layout HTML not found');
    if (layout.templateType !== 'pdf') {
      throw new BadRequestException('Layout must be of type "pdf"');
    }

    const data = dto.data ?? {};

    // 1) Content del reporte
    const contentHtml = this.reportBuilder.build(dto.report as any, data);

    // 2) Layout + Content
    const finalHtml = this.composer.compose({
      layoutHtml: layout.html,
      layoutCss: layout.css ?? '',
      contentHtml,
      context: { company, theme },
      data,
      meta: this.buildMeta(),
      leaveDataPlaceholders: false,
    });

    // 3) Generar PDF
    const file = await this.generator.handle({
      format: 'pdf',
      filename: 'preview-report.pdf',
      payload: { html: finalHtml },
      meta: {},
    });

    return file.buffer;
  }

  // ─────────────────────────────
  // 3) Report PDF Preview (Buffer)

  // ─────────────────────────────
  private buildMeta() {
    const now = new Date();
    return {
      year: now.getFullYear(),
      generatedAtIso: now.toISOString(),
      generatedAtPretty: now.toLocaleString('en-AU', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  }

  // ─────────────────────────────
  // Helpers

  // ─────────────────────────────
  private getByPath(obj: any, path: string) {
    const parts = String(path ?? '')
      .split('.')
      .map((p) => p.trim())
      .filter(Boolean);

    let cur = obj;
    for (const p of parts) {
      if (cur == null) return undefined;
      cur = cur[p];
    }
    return cur;
  }
}
