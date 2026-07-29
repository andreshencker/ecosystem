import {
  Body,
  Controller,
  Delete,
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

import { CompanyIntegrationsService } from './company-integrations.service';
import { CreateCompanyIntegrationDto } from './dto/create-company-integration.dto';
import { UpdateCompanyIntegrationDto } from './dto/update-company-integration.dto';

@ApiTags('Company Integrations')
@Controller('company-integrations')
export class CompanyIntegrationsController {
  constructor(
    private readonly config: ConfigService,
    private readonly service: CompanyIntegrationsService,
  ) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create integration — raw token returned ONCE' })
  async create(
    @Headers('x-api-key') apiKey: string,
    @Body() dto: CreateCompanyIntegrationDto,
  ) {
    this.assertApiKey(apiKey);
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
    this.assertApiKey(apiKey);
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
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
    @Query('active') active?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.assertApiKey(apiKey);
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
  async getById(@Headers('x-api-key') apiKey: string, @Param('id') id: string) {
    this.assertApiKey(apiKey);
    return this.service.findById(id);
  }

  @Patch(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update an integration' })
  async update(
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyIntegrationDto,
  ) {
    this.assertApiKey(apiKey);
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete an integration permanently' })
  async remove(@Headers('x-api-key') apiKey: string, @Param('id') id: string) {
    this.assertApiKey(apiKey);
    return this.service.remove(id);
  }

  // ── Token operations ───────────────────────────────────────────────────────

  @Post(':id/rotate-token')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Rotate the integration token — new raw token returned ONCE',
  })
  async rotateToken(
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
  ) {
    this.assertApiKey(apiKey);
    return this.service.rotateToken(id);
  }

  // ── Activation ─────────────────────────────────────────────────────────────

  @Post(':id/deactivate')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Deactivate an integration (blocks token resolver)',
  })
  async deactivate(
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
  ) {
    this.assertApiKey(apiKey);
    return this.service.deactivate(id);
  }

  @Post(':id/activate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Re-activate a previously deactivated integration' })
  async activate(
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
  ) {
    this.assertApiKey(apiKey);
    return this.service.activate(id);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

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
