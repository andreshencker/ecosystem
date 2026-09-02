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
import { DocumentCatalogueService } from '../../files/document-catalogue/document-catalogue.service';
import { buildPdfStructurePlaceholder } from './builders/pdf-contract-placeholder.builder';

import { PreviewLayoutDto } from './dto/preview-layout.dto';
import { PreviewNotificationDto } from './dto/preview-notification.dto';
import { PreviewReportDto } from './dto/preview-report.dto';
import { PreviewDocumentStructureDto } from './dto/preview-document-structure.dto';

@Injectable()
export class PreviewService {
  constructor(
    private readonly sot: SourceOfTruthService,
    private readonly composer: TemplateComposerService,
    private readonly generator: GeneratorService,
    private readonly reportBuilder: ReportContentBuilder,
    private readonly docService: DocumentCatalogueService,
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
  // 4) Document Catalogue — structural PDF preview
  // ─────────────────────────────

  /**
   * Generates a structural PDF preview for a stored document contract.
   *
   * No runtime business data is used.  Every value is a neutral placeholder
   * derived from the configured field labels and column headers in the contract.
   * The real company layout and theme are applied so the output shows the actual
   * document structure (spacing, typography, section positions, branding chrome).
   */
  async previewDocumentStructurePdf(
    dto: PreviewDocumentStructureDto,
  ): Promise<Buffer> {
    // 1. Resolve + validate the contract.
    //    DocumentCatalogueService already checks: domain active, format allowed,
    //    document exists & isActive, contract enabled.
    const resolved = await this.docService.findByCompanyAndCanonicalKey(
      dto.companyId,
      dto.canonicalKey,
    );

    if (resolved.resolvedFormat !== 'pdf') {
      throw new BadRequestException(
        `This endpoint only previews PDF contracts. The resolved format is "${resolved.resolvedFormat}".`,
      );
    }

    // 2. Build placeholder ReportPayload from the stored contract sections.
    const reportPayload = buildPdfStructurePlaceholder(
      resolved.resolvedContract,
      resolved.displayName,
    );

    // 3. Resolve company default PDF layout + theme (real branding, no mock).
    let render: any;
    try {
      const result = await this.sot.resolveForPdfReport({
        companyId: dto.companyId,
        data: {},
      });
      render = result.render;
    } catch (err: any) {
      if (
        err instanceof NotFoundException ||
        err?.status === 404 ||
        err?.response?.statusCode === 404
      ) {
        throw new BadRequestException(
          'A PDF layout must be configured before the document structure can be previewed.',
        );
      }
      throw err;
    }

    const layout = render?.layout ?? {};
    if (!layout?.html) {
      throw new BadRequestException(
        'A PDF layout must be configured before the document structure can be previewed.',
      );
    }

    // 4. Build document content HTML from placeholder payload.
    const contentHtml = this.reportBuilder.build(reportPayload, {});

    // 5. Compose final HTML: layout + CSS + content + company/theme variables.
    const now = new Date();
    const finalHtml = this.generator.composeHtml({
      layoutHtml: layout.html,
      layoutCss: layout.css ?? '',
      contentHtml,
      context: { company: render.company ?? {}, theme: render.theme ?? {} },
      data: {},
      meta: {
        year: now.getFullYear(),
        generatedAtIso: now.toISOString(),
        generatedAtPretty: now.toISOString().slice(0, 10),
        pageNumber: 1,
        totalPages: 1,
      },
      leaveDataPlaceholders: false,
    });

    // 6. Generate PDF buffer — nothing is saved.
    const file = await this.generator.handle({
      format: 'pdf',
      filename: `${resolved.documentKey}-structure-preview`,
      payload: { html: finalHtml },
      meta: {},
    });

    return file.buffer;
  }

  // ─────────────────────────────
  // Helpers

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
