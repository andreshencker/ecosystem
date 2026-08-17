import {
  Body,
  Controller,
  Headers,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ReportService } from './report.service';

import { CurrentUser } from '../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import { RelayTenantContextService } from '../../infrastructure/security/services/relay-tenant-context.service';

@Controller('files/reports')
export class ReportController {
  constructor(
    private readonly config: ConfigService,
    private readonly reports: ReportService,
    private readonly tenantContext: RelayTenantContextService,
  ) {}

  @Post('generate/pdf')
  async generatePdf(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Body() dto: GenerateReportDto,
    @Res() res: Response,
  ) {
    const companyId = await this.resolveCompanyId(
      ctx,
      apiKey,
      dto.companyId,
      'relay.use',
    );

    const out = await this.reports.generatePdf({
      companyId, // ✅
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

  private assertApiKey(apiKey?: string) {
    const expectedKey = this.config.get<string>('COMMUNICATION_API_KEY');
    if (!apiKey || !expectedKey || apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid API key');
    }
  }
}
