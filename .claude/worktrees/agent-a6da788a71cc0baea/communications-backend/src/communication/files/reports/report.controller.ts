import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ReportService } from './report.service';
import { CommunicationApiKeyGuard } from '../../common/guards/communication-api-key.guard';

@UseGuards(CommunicationApiKeyGuard)
@Controller('files/reports')
export class ReportController {
  constructor(private readonly reports: ReportService) {}

  @Post('generate/pdf')
  async generatePdf(@Body() dto: GenerateReportDto, @Res() res: Response) {
    const out = await this.reports.generatePdf({
      companyId: dto.companyId, // ✅
      filename: dto.filename,
      report: dto.report as any,
      data: dto.data ?? {},
    });

    res.setHeader('Content-Type', out.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${out.filename}"`,
    );
    return res.send(out.buffer);
  }
}
