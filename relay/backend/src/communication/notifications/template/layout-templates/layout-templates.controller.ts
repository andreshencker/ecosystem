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
import { parsePagination } from '../../../common/pagination/pagination.util';
import { CurrentUser } from '../../../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../../../infrastructure/security/types/auth-context.types';
import { RelayTenantContextService } from '../../../../infrastructure/security/services/relay-tenant-context.service';

import { LayoutTemplatesService } from './layout-templates.service';
import { CreateLayoutTemplateDto } from './dto/create-layout-template.dto';
import { UpdateLayoutTemplateDto } from './dto/update-layout-template.dto';
import type { TemplateType } from './schemas/layout-template.schema';

@ApiTags('Layout Templates')
@Controller('layout-templates')
export class LayoutTemplatesController {
  constructor(
    private readonly config: ConfigService,
    private readonly service: LayoutTemplatesService,
    private readonly tenantContext: RelayTenantContextService,
  ) {}

  /**
   * ✅ FLAT: listar layouts por company (usa todos los themes de esa company)
   * GET /layout-templates/by-company?companyId=...&templateType=email&active=true&includeHtml=false
   */
  @Get('by-company')
  @HttpCode(200)
  @ApiOperation({ summary: 'List layout templates by company' })
  @ApiQuery({ name: 'companyId', required: true, type: String })
  @ApiQuery({ name: 'templateType', required: false, type: String })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiQuery({ name: 'includeHtml', required: false, type: Boolean })
  @ApiQuery({ name: 'populateTheme', required: false, type: Boolean })
  @ApiQuery({ name: 'populateCompany', required: false, type: Boolean })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max templates (1–200, default 50)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Templates to skip (default 0)',
  })
  async listByCompany(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
    @Query('templateType') templateType?: TemplateType,
    @Query('active') active?: string,
    @Query('includeHtml') includeHtml?: string,
    @Query('populateTheme') populateTheme?: string,
    @Query('populateCompany') populateCompany?: string,
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

    return this.service.findAllByCompanyFlat({
      companyId,
      templateType,
      active: this.toBool(active),
      includeHtml: this.toBool(includeHtml) ?? false,
      populateTheme: this.toBool(populateTheme) ?? true,
      populateCompany: this.toBool(populateCompany) ?? true,
      limit: parsedLimit,
      offset: parsedOffset,
    });
  }

  /**
   * ✅ DEFAULT (runtime/report): companyId + templateType → default theme activo → default layout activo
   * GET /layout-templates/default-by-company?companyId=...&templateType=email
   */
  @Get('default-by-company')
  @HttpCode(200)
  async getDefaultByCompany(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
    @Query('templateType') templateType: TemplateType,
    @Query('populateTheme') populateTheme?: string,
    @Query('populateCompany') populateCompany?: string,
  ) {
    companyId = await this.resolveCompanyId(
      ctx,
      apiKey,
      companyId,
      'relay.use',
    );

    return this.service.getDefaultByCompanyWithContext({
      companyId,
      templateType,
      populateTheme: this.toBool(populateTheme) ?? true,
      populateCompany: this.toBool(populateCompany) ?? true,
    });
  }

  // ─────────────────────────────────────────────
  // ✅ RUTAS FIJAS PRIMERO (para evitar "Invalid id")
  // ─────────────────────────────────────────────

  /**
   * ✅ OVERVIEW (auditoría)
   * GET /layout-templates/company-overview?companyId=...&includeHtml=false
   */
  @Get('company-overview')
  @HttpCode(200)
  async companyOverview(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
    @Query('includeHtml') includeHtml?: string,
  ) {
    companyId = await this.resolveCompanyId(
      ctx,
      apiKey,
      companyId,
      'relay.use',
    );

    return this.service.getCompanyOverview({
      companyId,
      includeHtml: this.toBool(includeHtml) ?? false,
    });
  }

  @Get(':id')
  @HttpCode(200)
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

    return this.service.getByIdWithContext({
      id,
      companyId,
      populateTheme: true,
      populateCompany: true,
    });
  }

  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Body() dto: CreateLayoutTemplateDto,
  ) {
    const companyId = await this.resolveOptionalCompanyId(
      ctx,
      apiKey,
      'relay.use',
    );
    if (companyId) {
      await this.service.assertThemeBelongsToCompany(
        dto.companyThemeId,
        companyId,
      );
    }
    return this.service.create(dto);
  }

  // ─────────────────────────────────────────────
  // ✅ RUTAS DINÁMICAS AL FINAL
  // ─────────────────────────────────────────────

  @Patch(':id')
  @HttpCode(200)
  async update(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
    @Body() dto: UpdateLayoutTemplateDto,
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

  private assertApiKey(apiKey?: string) {
    const expected = this.config.get<string>('RELAY_API_KEY');
    if (!apiKey || !expected || apiKey !== expected) {
      throw new UnauthorizedException('Invalid API key');
    }
  }

  private toBool(v?: string) {
    if (v === undefined) return undefined;
    return v === 'true' || v === '1';
  }
}
