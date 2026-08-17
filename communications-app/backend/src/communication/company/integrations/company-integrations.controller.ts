import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { parsePagination } from '../../common/pagination/pagination.util';
import { CurrentUser } from '../../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../../infrastructure/security/types/auth-context.types';
import { RelayTenantContextService } from '../../../infrastructure/security/services/relay-tenant-context.service';

import { CompanyIntegrationsService } from './company-integrations.service';
import { CreateCompanyIntegrationDto } from './dto/create-company-integration.dto';
import { UpdateCompanyIntegrationDto } from './dto/update-company-integration.dto';

@ApiTags('Company Integrations')
@Controller('company-integrations')
export class CompanyIntegrationsController {
  constructor(
    private readonly config: ConfigService,
    private readonly service: CompanyIntegrationsService,
    private readonly tenantContext: RelayTenantContextService,
  ) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create integration — raw token returned ONCE' })
  async create(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Body() dto: CreateCompanyIntegrationDto,
  ) {
    dto.companyId = await this.resolveCompanyId(
      ctx,
      apiKey,
      dto.companyId,
      'relay.use',
    );
    return this.service.create(dto);
  }

  // ── Platform Admin listing (all companies, with company info populated) ────
  //
  // Must be declared BEFORE @Get(':id') so NestJS does not treat "modules"
  // as a dynamic :id segment.

  @Get('modules/all')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Platform Admin — list all integrations across all companies',
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'environment', required: false })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiQuery({ name: 'expired', required: false, type: Boolean })
  @ApiQuery({ name: 'neverUsed', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async listForPlatform(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Query('search') search?: string,
    @Query('companyId') companyId?: string,
    @Query('environment') environment?: string,
    @Query('active') active?: string,
    @Query('expired') expired?: string,
    @Query('neverUsed') neverUsed?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.assertAdminAccess(ctx, apiKey);
    const { limit: parsedLimit, offset: parsedOffset } = parsePagination(
      limit,
      offset,
    );
    return this.service.findAllForPlatform({
      search,
      companyId,
      environment,
      active: this.toBool(active),
      expired: this.toBool(expired),
      neverUsed: this.toBool(neverUsed),
      limit: parsedLimit,
      offset: parsedOffset,
    });
  }

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'List integrations for a company' })
  @ApiQuery({ name: 'companyId', required: true })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async list(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
    @Query('active') active?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    companyId = await this.resolveCompanyId(
      ctx,
      apiKey,
      companyId,
      'relay.use',
    );
    const { limit: parsedLimit, offset: parsedOffset } = parsePagination(
      limit,
      offset,
    );
    return this.service.findAll({
      companyId,
      active: this.toBool(active),
      limit: parsedLimit,
      offset: parsedOffset,
    });
  }

  /**
   * GET /company-integrations/me
   *
   * Resolves the Communications company that owns the provided integration token.
   * Uses x-integration-token (NOT the admin x-api-key) — intended for external
   * apps (e.g. Business App) to verify their stored token and discover which
   * Communications company it belongs to.
   */
  @Get('me')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Resolve the company that owns this integration token (x-integration-token)',
  })
  async me(@Headers('x-integration-token') token: string) {
    if (!token?.trim()) {
      throw new UnauthorizedException('x-integration-token header is required');
    }
    return this.service.resolveCompanyByToken(token.trim());
  }

  @Get(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get a single integration by ID' })
  async getById(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
  ) {
    const companyId = await this.resolveOptionalCompanyId(
      ctx,
      apiKey,
      'relay.use',
    );
    if (companyId) {
      await this.service.assertBelongsToCompany(id, companyId);
    }
    return this.service.findById(id);
  }

  @Patch(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update an integration' })
  async update(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyIntegrationDto,
  ) {
    const companyId = await this.resolveOptionalCompanyId(
      ctx,
      apiKey,
      'relay.use',
    );
    if (companyId) {
      await this.service.assertBelongsToCompany(id, companyId);
    }
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete an integration permanently' })
  async remove(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
  ) {
    const companyId = await this.resolveOptionalCompanyId(
      ctx,
      apiKey,
      'relay.use',
    );
    if (companyId) {
      await this.service.assertBelongsToCompany(id, companyId);
    }
    return this.service.remove(id);
  }

  // ── Token operations ───────────────────────────────────────────────────────

  @Post(':id/rotate-token')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Rotate the integration token — new raw token returned ONCE',
  })
  async rotateToken(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
  ) {
    const companyId = await this.resolveOptionalCompanyId(
      ctx,
      apiKey,
      'relay.use',
    );
    if (companyId) {
      await this.service.assertBelongsToCompany(id, companyId);
    }
    return this.service.rotateToken(id);
  }

  // ── Activation ─────────────────────────────────────────────────────────────

  @Post(':id/deactivate')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Deactivate an integration (blocks token resolver)',
  })
  async deactivate(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
  ) {
    const companyId = await this.resolveOptionalCompanyId(
      ctx,
      apiKey,
      'relay.use',
    );
    if (companyId) {
      await this.service.assertBelongsToCompany(id, companyId);
    }
    return this.service.deactivate(id);
  }

  @Post(':id/activate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Re-activate a previously deactivated integration' })
  async activate(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
  ) {
    const companyId = await this.resolveOptionalCompanyId(
      ctx,
      apiKey,
      'relay.use',
    );
    if (companyId) {
      await this.service.assertBelongsToCompany(id, companyId);
    }
    return this.service.activate(id);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

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

  // Platform Admin global listing: platform_admin users (via Grapifly session)
  // or the internal COMMUNICATION_API_KEY (engine-to-engine / provisioning).
  private assertAdminAccess(ctx: AuthContext | undefined, apiKey: string) {
    if (ctx?.actorType === 'user') {
      if (ctx.role !== 'platform_admin') {
        throw new ForbiddenException(
          'Only platform_admin may list integrations across all companies',
        );
      }
      return;
    }
    this.assertApiKey(apiKey);
  }

  private assertApiKey(apiKey?: string): void {
    const expected = this.config.get<string>('COMMUNICATION_API_KEY');
    if (!apiKey || !expected || apiKey !== expected) {
      throw new UnauthorizedException('Invalid API key');
    }
  }

  private toBool(v?: string): boolean | undefined {
    if (v === undefined) return undefined;
    return v === 'true' || v === '1';
  }
}
