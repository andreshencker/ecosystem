// src/notifications/notification.controller.ts
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { NotificationService } from './notification.service';
import { NotifyEventDto } from './dto/notify-event.dto';
import { PreviewByEventKeyDto } from './dto/preview-by-event-key.dto';
import { ExecutionLogService } from './execution-log/execution-log.service';
import { NotificationRenderService } from './render/notification-render.service';
import { EventCatalogueService } from './events/event-catalogue/event-catalogue.service';
import { parsePagination } from '../common/pagination/pagination.util';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly config: ConfigService,
    private readonly service: NotificationService,
    private readonly logs: ExecutionLogService,
    private readonly renderer: NotificationRenderService,
    private readonly eventCatalogue: EventCatalogueService,
  ) {}

  /**
   * POST /notifications/event
   * Returns 200 when all channels succeed, 207 when any channel fails.
   * Per DEC-001 Option A. Response body shape is unchanged in both cases.
   */
  @Post('event')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger a notification event' })
  @ApiResponse({
    status: 200,
    description: 'All channels delivered successfully — every results[].success is true',
  })
  @ApiResponse({
    status: 207,
    description: 'One or more channels failed — inspect results[].success per channel',
  })
  async notifyEvent(
    @Headers('x-api-key') apiKey: string,
    @Body() dto: NotifyEventDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.assertApiKey(apiKey);
    const result = await this.service.notifyEvent(dto);
    const allSucceeded = result.results.every((r) => r.success);
    if (!allSucceeded) {
      res.status(HttpStatus.MULTI_STATUS);
    }
    return result;
  }

  /**
   * POST /notifications/preview/event-by-key
   *
   * Renders any event to its final subject + HTML without delivery.
   * No provider lookup. No credentials. No execution log. Rendering only.
   * DEC-017 §10.4 / DEC-018 §8.1 — rendering is independent from delivery.
   */
  @Post('preview/event-by-key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview a notification email by canonical event key — rendering only, no delivery (DEC-017 §10.4)' })
  async previewByEventKey(
    @Headers('x-api-key') apiKey: string,
    @Body() dto: PreviewByEventKeyDto,
  ): Promise<{ subject: string; html: string }> {
    this.assertApiKey(apiKey);

    // Resolve event (validates company + domain + event existence)
    const event = await this.eventCatalogue.findByCompanyAndCanonicalKey(
      dto.companyId,
      dto.canonicalEventKey,
    );

    // Render — stops here, never reaches provider or credentials
    const { subject, html } = await this.renderer.renderEmail({
      companyId: dto.companyId,
      eventKey: event.eventKey,
      data: dto.data ?? {},
      leavePlaceholders: true, // show {{data.x}} for missing vars in preview
    });

    return { subject, html };
  }

  @Get('logs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List execution logs for a company (DEC-018 §10.3)' })
  @ApiQuery({ name: 'companyId', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async listLogs(
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.assertApiKey(apiKey);
    const { limit: l, offset: o } = parsePagination(limit, offset);
    return this.logs.findAll({ companyId, limit: l, offset: o });
  }

  private assertApiKey(apiKey?: string) {
    const expected = this.config.get<string>('COMMUNICATION_API_KEY');
    if (!apiKey || !expected || apiKey !== expected) {
      throw new UnauthorizedException('Invalid API key');
    }
  }
}
