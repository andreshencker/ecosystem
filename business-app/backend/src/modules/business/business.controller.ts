import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { BusinessService } from './business.service';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { UpdateBusinessSmtpDto } from './dto/update-business-smtp.dto';
import { BusinessSmtpResponseDto } from './dto/business-smtp-response.dto';
import { UpdateFiscalProfileDto } from './dto/fiscal-profile.dto';
import { CurrentUser } from '../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';

// Access control is enforced in BusinessService.
// GlobalAuthGuard (APP_GUARD) validates the JWT and populates ctx with
// role, scope, companyId, and businessKey from a DB lookup.

@ApiTags('Business (Portal)')
@ApiBearerAuth()
@Controller('company')
export class BusinessController {
  constructor(private readonly service: BusinessService) {}

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
    summary: 'Update own company (platform_admin and business_owner only)',
  })
  async updateOwnCompany(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: UpdateBusinessDto,
  ) {
    return this.service.updateOwnCompany(ctx, dto);
  }

  // ── Fiscal profile ────────────────────────────────────────────────────────

  @Get('fiscal-profile')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get company fiscal profile (ABN, deposit account, currency)',
  })
  async getFiscalProfile(@CurrentUser() ctx: AuthContext) {
    return this.service.getFiscalProfile(ctx);
  }

  @Patch('fiscal-profile')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Update company fiscal profile (platform_admin and business_owner only)',
  })
  async updateFiscalProfile(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: UpdateFiscalProfileDto,
  ) {
    return this.service.updateFiscalProfile(ctx, dto);
  }

  // ── SMTP settings ─────────────────────────────────────────────────────────

  @Get('smtp')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get company SMTP settings' })
  async getSmtp(
    @CurrentUser() ctx: AuthContext,
  ): Promise<BusinessSmtpResponseDto> {
    return this.service.getSmtp(ctx);
  }

  @Patch('smtp')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update company SMTP settings' })
  async updateSmtp(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: UpdateBusinessSmtpDto,
  ): Promise<BusinessSmtpResponseDto> {
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
