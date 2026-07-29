import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { SourceOfTruthService } from '../../common/source-of-truth/source-of-truth.service';
import { TemplateComposerService } from '../../common/template-engine/template-composer.service';

export type EmailRenderResult = {
  subject: string;
  html: string;
  layoutTemplateId: string | null;
  themeId: string | null;
};

@Injectable()
export class NotificationRenderService {
  constructor(
    private readonly sot: SourceOfTruthService,
    private readonly composer: TemplateComposerService,
  ) {}

  /**
   * Renders a notification email to its final subject + HTML.
   *
   * This is the single rendering implementation shared by:
   *   - NotificationService  (rendering phase, before delivery)
   *   - Preview endpoint     (rendering only, delivery never starts)
   *
   * Stops after composition. Never touches providers, credentials, or execution logs.
   */
  async renderEmail(params: {
    companyId: string;
    eventKey: string; // bare key — without domain prefix
    data: Record<string, any>;
    leavePlaceholders?: boolean;
  }): Promise<EmailRenderResult> {
    const leavePlaceholders =
      params.leavePlaceholders ??
      process.env.LEAVE_DATA_PLACEHOLDERS === 'true';

    const resolved = await this.sot.resolveForEmailNotificationByEventKey({
      companyId: params.companyId,
      eventKey: params.eventKey,
      data: params.data,
    });

    const layout = resolved.render.layout ?? {};
    if (!layout?.html) {
      throw new HttpException(
        'Default email layout not found for this company',
        HttpStatus.NOT_FOUND,
      );
    }

    const layoutTemplateId: string | null = layout.id ?? null;
    const themeRaw = resolved.render.theme;
    const themeId: string | null = themeRaw?._id
      ? String(themeRaw._id)
      : (themeRaw?.id ?? null);

    const baseCtx = {
      context: {
        company: resolved.render.company,
        theme: resolved.render.theme,
      },
      data: resolved.render.data,
      meta: resolved.render.meta,
      leaveDataPlaceholders: leavePlaceholders,
    };

    const subject = this.composer.compose({
      ...baseCtx,
      layoutHtml: String(resolved.subjectTpl ?? ''),
      layoutCss: '',
      contentHtml: '',
    });

    const html = this.composer.compose({
      ...baseCtx,
      layoutHtml: layout.html,
      layoutCss: layout.css ?? '',
      contentHtml: String(resolved.contentHtmlTpl ?? '').trim(),
    });

    return { subject, html, layoutTemplateId, themeId };
  }
}
