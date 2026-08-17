// src/notifications/notification.controller.ts
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { NotificationService } from './notification.service';
import { NotifyEventDto } from './dto/notify-event.dto';
import { PreviewByEventKeyDto } from './dto/preview-by-event-key.dto';
import { ExecutionLogService } from './execution-log/execution-log.service';
import { NotificationRenderService } from './render/notification-render.service';
import { EventCatalogueService } from './events/event-catalogue/event-catalogue.service';
import { parsePagination } from '../common/pagination/pagination.util';
import { CurrentUser } from '../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import { RelayTenantContextService } from '../../infrastructure/security/services/relay-tenant-context.service';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly service: NotificationService,
    private readonly logs: ExecutionLogService,
    private readonly renderer: NotificationRenderService,
    private readonly eventCatalogue: EventCatalogueService,
    private readonly tenantContext: RelayTenantContextService,
  ) {}

  /**
   * POST /notifications/event
   *
   * Authentication — accepts two methods (guard resolves both before reaching here):
   *   a. x-api-key: <COMMUNICATION_API_KEY>  — internal/admin callers
   *   b. x-api-key or x-integration-token: <integration_token>  — external apps (Business App)
   *
   * Returns 200 when all channels succeed, 207 when any channel fails.
   * Per DEC-001 Option A. Response body shape is unchanged in both cases.
   */
  @Post('event')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger a notification event' })
  @ApiResponse({
    status: 200,
    description: 'All channels delivered successfully',
  })
  @ApiResponse({
    status: 207,
    description: 'One or more channels failed — inspect results[].success',
  })
  async notifyEvent(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Req() req: Request,
    @Body() dto: NotifyEventDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authCtx = (req as any).authContext as
      | { keyId?: string; companyId?: string }
      | undefined;
    const isAdminAuth = authCtx?.keyId === 'internal';
    const isIntegration = authCtx?.keyId === 'integration-token';
    const authMethod =
      ctx.actorType === 'user'
        ? 'relay-session'
        : isIntegration
          ? 'integration-token'
          : 'x-api-key';

    // ── Effective companyId resolution ────────────────────────────────────────
    //   - Grapifly session user  → resolved + permission-checked via
    //     RelayTenantContextService ('relay.use'), never trusted directly from
    //     the raw authContext claim.
    //   - admin key              → modules company (isPlatformCompany: true),
    //     set on authCtx.companyId by GlobalAuthGuard.
    //   - integration-token      → company that owns the token, also set on
    //     authCtx.companyId by GlobalAuthGuard.
    // dto.companyId (from body) is never trusted — always ignored.
    let effectiveCompanyId: string | undefined;

    if (ctx.actorType === 'user') {
      effectiveCompanyId = (await this.tenantContext.resolve(ctx, 'relay.use'))
        .companyId;
    } else {
      // Admin-key requests still require assertApiKey() as a second confirmation.
      // Integration-token requests were fully validated by GlobalAuthGuard.
      if (!isIntegration) {
        this.assertApiKey(apiKey);
      }
      effectiveCompanyId = authCtx?.companyId;
    }

    if (!effectiveCompanyId) {
      this.logger.error(
        `[notifyEvent] No effectiveCompanyId could be resolved — ` +
          `authMethod=${authMethod} authCtx.companyId=undefined dto.companyId=${dto.companyId}`,
      );
      throw new UnauthorizedException(
        'Could not resolve company from authentication context',
      );
    }

    this.logger.log(
      `[notifyEvent] ── Auth & company resolution ──\n` +
        `  authMethod:          ${authMethod}\n` +
        `  isAdminAuth:         ${isAdminAuth}${isAdminAuth ? ' (modules company)' : ''}\n` +
        `  effectiveCompanyId:  ${effectiveCompanyId}  ← used for event lookup\n` +
        `  dto.companyId:       ${dto.companyId ?? '(not sent)'}  ← from request body (informational)\n` +
        `  event:               ${dto.event}\n` +
        `  email:               ${dto.email}`,
    );

    // Sanity check for integration-token: body companyId should match resolved companyId.
    if (
      isIntegration &&
      dto.companyId &&
      dto.companyId !== effectiveCompanyId
    ) {
      this.logger.warn(
        `[notifyEvent] MISMATCH — integration token resolved companyId="${effectiveCompanyId}" ` +
          `but body.companyId="${dto.companyId}". ` +
          `Using token-resolved companyId. Check Business App CommunicationConnection configuration.`,
      );
    }

    // Override dto.companyId with the auth-resolved companyId.
    // Communications always uses the company resolved from authentication, never trusting body.companyId.
    const effectiveDto = { ...dto, companyId: effectiveCompanyId };
    const result = await this.service.notifyEvent(effectiveDto);
    const allSucceeded = result.results.every((r) => r.success);

    this.logger.log(
      `[notifyEvent] status=${allSucceeded ? 'OK' : 'MULTI_STATUS'} ` +
        `channels=${result.results.length} ` +
        `succeeded=${result.results.filter((r) => r.success).length}`,
    );

    if (!allSucceeded) {
      res.status(HttpStatus.MULTI_STATUS);
    }
    return result;
  }

  /**
   * POST /notifications/preview/event-by-key
   * Rendering only — no delivery.
   * companyId is resolved from the authentication context, never from the body.
   */
  @Post('preview/event-by-key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Preview a notification email by canonical event key — rendering only, no delivery (DEC-017 §10.4)',
  })
  async previewByEventKey(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Req() req: Request,
    @Body() dto: PreviewByEventKeyDto,
  ): Promise<{ subject: string; html: string }> {
    let effectiveCompanyId: string | undefined;

    if (ctx.actorType === 'user') {
      effectiveCompanyId = (await this.tenantContext.resolve(ctx, 'relay.use'))
        .companyId;
    } else {
      this.assertApiKey(apiKey);

      const authCtx = (req as any).authContext as
        | { companyId?: string }
        | undefined;
      effectiveCompanyId = authCtx?.companyId;
    }

    if (!effectiveCompanyId) {
      throw new UnauthorizedException(
        'Could not resolve company from authentication context',
      );
    }

    const event = await this.eventCatalogue.findByCompanyAndCanonicalKey(
      effectiveCompanyId,
      dto.canonicalEventKey,
    );

    const { subject, html } = await this.renderer.renderEmail({
      companyId: effectiveCompanyId,
      eventKey: event.eventKey,
      data: dto.data ?? {},
      leavePlaceholders: true,
    });

    return { subject, html };
  }

  @Get('logs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List execution logs for a company (DEC-018 §10.3)',
  })
  @ApiQuery({ name: 'companyId', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async listLogs(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    companyId = await this.resolveCompanyId(
      ctx,
      apiKey,
      companyId,
      'relay.use',
    );
    const { limit: l, offset: o } = parsePagination(limit, offset);
    return this.logs.findAll({ companyId, limit: l, offset: o });
  }

  private async resolveCompanyId(
    ctx: AuthContext,
    apiKey: string,
    requestedCompanyId: string,
    permission: string,
  ): Promise<string> {
    if (ctx.actorType === 'user') {
      return (await this.tenantContext.resolve(ctx, permission)).companyId;
    }
    this.assertApiKey(apiKey);
    return requestedCompanyId;
  }

  private assertApiKey(apiKey?: string): void {
    const expected = this.config.get<string>('COMMUNICATION_API_KEY');
    if (!apiKey || !expected || apiKey !== expected) {
      throw new UnauthorizedException('Invalid API key');
    }
  }
}
