import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { CompanyPortalService } from './company-portal.service';
import { UpdateCompanyPortalDto } from './dto/update-company-portal.dto';
import { UpdateCompanySmtpDto } from './dto/update-company-smtp.dto';
import { CompanySmtpResponseDto } from './dto/company-smtp-response.dto';
import { CurrentUser } from '../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';

// Access control is enforced in CompanyPortalService via DB user lookup.
// GlobalAuthGuard (APP_GUARD) ensures every request carries a valid JWT.
// RolesGuard is not used here because ctx.role is never populated by the
// current JWT strategy (JWT only carries sub+type; role is resolved from DB).

@ApiTags('Company (Portal)')
@ApiBearerAuth()
@Controller('company')
export class CompanyPortalController {
  constructor(private readonly service: CompanyPortalService) {}

  // ── Company identity ──────────────────────────────────────────────────────

  @Get()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get own company (resolves modules company for platform_admin)',
  })
  async getOwnCompany(@CurrentUser() ctx: AuthContext) {
    return this.service.getOwnCompany(ctx);
  }

  @Patch()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Update own company (platform_admin and company_owner only)',
  })
  async updateOwnCompany(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: UpdateCompanyPortalDto,
  ) {
    return this.service.updateOwnCompany(ctx, dto);
  }

  // ── SMTP settings ─────────────────────────────────────────────────────────

  @Get('smtp')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get company SMTP settings' })
  async getSmtp(
    @CurrentUser() ctx: AuthContext,
  ): Promise<CompanySmtpResponseDto> {
    return this.service.getSmtp(ctx);
  }

  @Patch('smtp')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update company SMTP settings' })
  async updateSmtp(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: UpdateCompanySmtpDto,
  ): Promise<CompanySmtpResponseDto> {
    return this.service.updateSmtp(ctx, dto);
  }

  @Post('smtp/test')
  @HttpCode(200)
  @ApiOperation({ summary: 'Test company SMTP connection' })
  async testSmtp(
    @CurrentUser() ctx: AuthContext,
  ): Promise<{ ok: boolean; message: string }> {
    return this.service.testSmtp(ctx);
  }
}
