// src/common/source-of-truth/source-of-truth.service.ts
import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';

import { LayoutTemplatesService } from '../../notifications/template/layout-templates/layout-templates.service';
import { EventCatalogueService } from '../../notifications/events/event-catalogue/event-catalogue.service';

export type TemplateType = 'email' | 'pdf';

/**
 * Shapes normalizados (NUNCA company/theme undefined)
 */
export type ResolvedLayoutContext = {
  layout: any; // LayoutTemplateContextResponseDto.layout
  company: any; // Company populated o {}
  theme: any; // CompanyTheme populated o {}
};

export type ResolvedEventChannel = {
  enabled: boolean;
  subject?: string | null;
  content?: string | null;
  requiredVariables?: string[];
  optionalVariables?: string[];
  files?: any;
};

export type ResolvedEventContext = {
  event: any;
  channel: ResolvedEventChannel;
  templateType: TemplateType;
};

export type RenderContext = {
  company: any;
  theme: any;
  layout: any;
  data: Record<string, any>;
  meta: {
    year: number;
    generatedAtIso: string;
  };
};

/**
 * Args compatibles (para no romper servicios viejos)
 */
export type ResolveLayoutArgs =
  | { layoutTemplateId: string } // preview
  | { companyId: string; templateType: TemplateType }; // runtime default por company

export type ResolveEventArgs = {
  eventCatalogueId: string;
  templateType: TemplateType;
};

export type ResolveEventByKeyArgs = {
  companyId: string;
  eventKey: string;
  templateType: TemplateType;
};

@Injectable()
export class SourceOfTruthService {
  constructor(
    private readonly layouts: LayoutTemplatesService,
    private readonly events: EventCatalogueService,
  ) {}

  // ─────────────────────────────
  // Helpers

  /**
   * Preview: layout específico por ID
   */
  async resolveLayoutById(params: {
    layoutTemplateId: string;
  }): Promise<ResolvedLayoutContext> {
    const raw = await this.layouts.getByIdWithContext({
      id: params.layoutTemplateId,
      populateTheme: true,
      populateCompany: true,
    });

    return this.normalizeLayoutContext(raw);
  }

  /**
   * Preview: event específico por ID (se mantiene para preview)
   */
  async resolveEventById(
    params: ResolveEventArgs,
  ): Promise<ResolvedEventContext> {
    const event = await this.events.getById({
      id: params.eventCatalogueId,
      populateDomainCatalogue: true,
    });

    return {
      event,
      channel: this.normalizeEventChannel(event, params.templateType),
      templateType: params.templateType,
    };
  }

  // ─────────────────────────────
  async resolveEventByKey(
    params: ResolveEventByKeyArgs,
  ): Promise<ResolvedEventContext> {
    const companyId = String(params.companyId ?? '').trim();
    const eventKey = String(params.eventKey ?? '')
      .trim()
      .toLowerCase();

    if (!companyId) throw new Error('companyId is required');
    if (!eventKey) throw new Error('eventKey is required');

    // validación temprana
    this.toObjectIdOrThrow(companyId, 'companyId');

    const event = await this.events.findByCompanyAndEventKey({
      companyId,
      eventKey,
      populateChannelsRuntime: false,
    });

    return {
      event,
      channel: this.normalizeEventChannel(event, params.templateType),
      templateType: params.templateType,
    };
  }

  // ─────────────────────────────
  // ✅ Preview resolvers (por ID)
  // ─────────────────────────────

  // ─────────────────────────────
  async resolveDefaultLayoutByCompany(params: {
    companyId: string;
    templateType: TemplateType;
  }): Promise<ResolvedLayoutContext> {
    // validación temprana
    this.toObjectIdOrThrow(params.companyId, 'companyId');

    const raw = await this.layouts.getDefaultByCompanyWithContext({
      companyId: params.companyId,
      templateType: params.templateType,
      populateTheme: true,
      populateCompany: true,
    });

    return this.normalizeLayoutContext(raw);
  }

  // ─────────────────────────────
  async resolveLayoutContext(
    args: ResolveLayoutArgs,
  ): Promise<ResolvedLayoutContext> {
    if ('layoutTemplateId' in args) {
      return this.resolveLayoutById({
        layoutTemplateId: args.layoutTemplateId,
      });
    }

    return this.resolveDefaultLayoutByCompany({
      companyId: args.companyId,
      templateType: args.templateType,
    });
  }

  // ─────────────────────────────
  // ✅ Runtime event resolver (por KEY) -> Notifications reales

  buildRenderContext(input: {
    layoutContext: ResolvedLayoutContext;
    data?: Record<string, any>;
  }): RenderContext {
    const now = new Date();

    return {
      company: input.layoutContext.company ?? {},
      theme: input.layoutContext.theme ?? {},
      layout: input.layoutContext.layout ?? {},
      data: input.data ?? {},
      meta: {
        year: now.getFullYear(),
        generatedAtIso: now.toISOString(),
      },
    };
  }

  // ─────────────────────────────
  // ✅ Runtime layout default por companyId

  // ─────────────────────────────
  async resolveForPdfReport(params: {
    companyId: string;
    data?: Record<string, any>;
  }) {
    const layoutContext = await this.resolveDefaultLayoutByCompany({
      companyId: params.companyId,
      templateType: 'pdf',
    });

    const render = this.buildRenderContext({
      layoutContext,
      data: params.data ?? {},
    });

    return { render };
  }

  // ─────────────────────────────
  // ✅ Backwards-compatible API (PreviewService viejo)

  // ─────────────────────────────
  async resolveForEmailNotificationByEventKey(params: {
    companyId: string;
    eventKey: string;
    data?: Record<string, any>;
  }) {
    const layoutContext = await this.resolveDefaultLayoutByCompany({
      companyId: params.companyId,
      templateType: 'email',
    });

    const eventContext = await this.resolveEventByKey({
      companyId: params.companyId,
      eventKey: params.eventKey,
      templateType: 'email',
    });

    const render = this.buildRenderContext({
      layoutContext,
      data: params.data ?? {},
    });

    const subjectTpl = eventContext.channel.subject ?? null;
    const contentHtmlTpl = String(eventContext.channel.content ?? '').trim();

    return {
      render,
      event: eventContext.event,
      channel: eventContext.channel,
      subjectTpl,
      contentHtmlTpl,
    };
  }

  // ─────────────────────────────
  async resolveForEmailNotification(params: {
    companyId: string;
    eventCatalogueId: string;
    data?: Record<string, any>;
  }) {
    const layoutContext = await this.resolveDefaultLayoutByCompany({
      companyId: params.companyId,
      templateType: 'email',
    });

    const eventContext = await this.resolveEventById({
      eventCatalogueId: params.eventCatalogueId,
      templateType: 'email',
    });

    const render = this.buildRenderContext({
      layoutContext,
      data: params.data ?? {},
    });

    const subjectTpl = eventContext.channel.subject ?? null;
    const contentHtmlTpl = String(eventContext.channel.content ?? '').trim();

    return {
      render,
      event: eventContext.event,
      channel: eventContext.channel,
      subjectTpl,
      contentHtmlTpl,
    };
  }

  // ─────────────────────────────
  // ✅ Runtime: Reports (PDF)

  // ─────────────────────────────
  private toObjectIdOrThrow(id: string, label: string) {
    if (!Types.ObjectId.isValid(id)) throw new Error(`Invalid ${label}`);
    return new Types.ObjectId(id);
  }

  // ─────────────────────────────
  // ✅ Runtime: Email Notifications por EVENT KEY (nuevo recomendado)

  private normalizeLayoutContext(raw: any): ResolvedLayoutContext {
    return {
      layout: raw?.layout ?? raw ?? null,
      company: raw?.company ?? {},
      theme: raw?.theme ?? {},
    };
  }

  // ─────────────────────────────
  // ✅ Legacy: Email Notifications por EVENT ID (para no romper tu código actual)
  // NOTA: Internamente resuelve el event por id, pero esto es SOLO compat.

  private normalizeEventChannel(
    event: any,
    templateType: TemplateType,
  ): ResolvedEventChannel {
    const channel = event?.channelContent?.[templateType];

    if (!channel) {
      return {
        enabled: false,
        subject: null,
        content: null,
        requiredVariables: [],
        optionalVariables: [],
      };
    }

    return {
      enabled: channel?.enabled === true,
      subject: channel?.subject ?? null,
      content: channel?.content ?? null,
      requiredVariables: Array.isArray(channel?.requiredVariables)
        ? channel.requiredVariables
        : [],
      optionalVariables: Array.isArray(channel?.optionalVariables)
        ? channel.optionalVariables
        : [],
      files: channel?.files ?? undefined,
    };
  }
}
