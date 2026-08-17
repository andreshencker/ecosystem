import {
  Body,
  Controller,
  Header,
  Headers,
  HttpCode,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

import { PreviewLayoutDto } from './dto/preview-layout.dto';
import { PreviewNotificationDto } from './dto/preview-notification.dto';
import { PreviewReportDto } from './dto/preview-report.dto';
import { PreviewDocumentStructureDto } from './dto/preview-document-structure.dto';
import { PreviewService } from './preview.service';
import { CurrentUser } from '../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import { RelayTenantContextService } from '../../infrastructure/security/services/relay-tenant-context.service';
import { LayoutTemplatesService } from '../notifications/template/layout-templates/layout-templates.service';
import { EventCatalogueService } from '../notifications/events/event-catalogue/event-catalogue.service';

@Controller('preview')
export class PreviewController {
  constructor(
    private readonly config: ConfigService,
    private readonly service: PreviewService,
    private readonly tenantContext: RelayTenantContextService,
    private readonly layoutTemplates: LayoutTemplatesService,
    private readonly eventCatalogue: EventCatalogueService,
  ) {}

  // ─────────────────────────────
  // 1) Layout puro
  // ─────────────────────────────
  @Post('layout/html')
  @HttpCode(200)
  @Header('Content-Type', 'text/html; charset=utf-8')
  async previewLayout(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Body() dto: PreviewLayoutDto,
  ) {
    // No companyId on this DTO — validate the caller (Grapifly session with
    // 'relay.use', or a valid api key) and, for session users, verify the
    // referenced layout actually belongs to their company so one tenant
    // cannot preview another tenant's templates by guessing an id.
    const companyId = await this.resolveOptionalCompanyId(
      ctx,
      apiKey,
      'relay.use',
    );
    if (companyId) {
      await this.layoutTemplates.assertBelongsToCompany(
        dto.layoutTemplateId,
        companyId,
      );
    }
    return this.service.previewLayoutHtml(dto);
  }

  // ─────────────────────────────
  // 2) Notification EMAIL
  // ─────────────────────────────
  @Post('notifications/email/html')
  @HttpCode(200)
  @Header('Content-Type', 'text/html; charset=utf-8')
  async previewNotification(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Body() dto: PreviewNotificationDto,
  ) {
    // No companyId on this DTO — validate the caller and, for session users,
    // verify both referenced resources belong to their company.
    const companyId = await this.resolveOptionalCompanyId(
      ctx,
      apiKey,
      'relay.use',
    );
    if (companyId) {
      await this.layoutTemplates.assertBelongsToCompany(
        dto.layoutTemplateId,
        companyId,
      );
      await this.eventCatalogue.assertBelongsToCompany(
        dto.eventCatalogueId,
        companyId,
      );
    }
    return this.service.previewNotificationEmailHtml(dto);
  }

  // ─────────────────────────────
  // 3) Report PDF
  // ─────────────────────────────
  @Post('reports/pdf')
  async previewReportPdf(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Body() dto: PreviewReportDto,
    @Res() res: Response,
  ) {
    // No companyId on this DTO — validate the caller and, for session users,
    // verify the referenced layout belongs to their company.
    const companyId = await this.resolveOptionalCompanyId(
      ctx,
      apiKey,
      'relay.use',
    );
    if (companyId) {
      await this.layoutTemplates.assertBelongsToCompany(
        dto.layoutTemplateId,
        companyId,
      );
    }
    const result = await this.service.previewReportPdf(dto);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'inline; filename="preview-report.pdf"',
    );

    return res.send(result);
  }

  // ─────────────────────────────
  // 4) Document Catalogue — structural PDF preview
  //
  // POST /preview/documents/structure/pdf
  // Body: { companyId, canonicalKey }
  //
  // Resolves the stored PDF contract, builds placeholder content from its
  // section definitions, applies the real company layout and theme, and returns
  // an inline PDF that shows document structure without business data.
  // ─────────────────────────────
  @Post('documents/structure/pdf')
  async previewDocumentStructurePdf(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Body() dto: PreviewDocumentStructureDto,
    @Res() res: Response,
  ) {
    dto.companyId = await this.resolveCompanyId(
      ctx,
      apiKey,
      dto.companyId,
      'relay.use',
    );
    const buffer = await this.service.previewDocumentStructurePdf(dto);

    const docKey = dto.canonicalKey.split('.')[1] ?? 'document';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${docKey}-structure-preview.pdf"`,
    );
    return res.send(buffer);
  }

  private async resolveCompanyId(
    ctx: AuthContext,
    apiKey: string,
    requestedCompanyId: string | undefined,
    permission: string,
  ): Promise<string> {
    if (ctx.actorType === 'user') {
      return (await this.tenantContext.resolve(ctx, permission)).companyId;
    }
    this.assertApiKey(apiKey);
    return requestedCompanyId as string;
  }

  private async resolveOptionalCompanyId(
    ctx: AuthContext,
    apiKey: string,
    permission: string,
  ): Promise<string | undefined> {
    if (ctx.actorType === 'user') {
      return (await this.tenantContext.resolve(ctx, permission)).companyId;
    }
    this.assertApiKey(apiKey);
    return undefined;
  }

  private assertApiKey(apiKey?: string): void {
    const expected = this.config.get<string>('COMMUNICATION_API_KEY');
    if (!apiKey || !expected || apiKey !== expected) {
      throw new UnauthorizedException('Invalid API key');
    }
  }
}
