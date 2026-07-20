import { Body, Controller, Header, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';

import { PreviewLayoutDto } from './dto/preview-layout.dto';
import { PreviewNotificationDto } from './dto/preview-notification.dto';
import { PreviewReportDto } from './dto/preview-report.dto';
import { PreviewService } from './preview.service';
import { CommunicationApiKeyGuard } from '../common/guards/communication-api-key.guard';

@UseGuards(CommunicationApiKeyGuard)
@Controller('preview')
export class PreviewController {
  constructor(private readonly service: PreviewService) {}

  // ─────────────────────────────
  // 1) Layout puro
  // ─────────────────────────────
  @Post('layout/html')
  @HttpCode(200)
  @Header('Content-Type', 'text/html; charset=utf-8')
  async previewLayout(@Body() dto: PreviewLayoutDto) {
    return this.service.previewLayoutHtml(dto);
  }

  // ─────────────────────────────
  // 2) Notification EMAIL
  // ─────────────────────────────
  @Post('notifications/email/html')
  @HttpCode(200)
  @Header('Content-Type', 'text/html; charset=utf-8')
  async previewNotification(@Body() dto: PreviewNotificationDto) {
    return this.service.previewNotificationEmailHtml(dto);
  }

  // ─────────────────────────────
  // 3) Report PDF
  // ─────────────────────────────
  @Post('reports/pdf')
  async previewReportPdf(@Body() dto: PreviewReportDto, @Res() res: Response) {
    const result = await this.service.previewReportPdf(dto);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'inline; filename="preview-report.pdf"',
    );

    return res.send(result);
  }
}
