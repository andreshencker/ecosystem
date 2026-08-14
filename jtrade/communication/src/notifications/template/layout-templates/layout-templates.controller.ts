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

import { LayoutTemplatesService } from './layout-templates.service';
import { CreateLayoutTemplateDto } from './dto/create-layout-template.dto';
import { UpdateLayoutTemplateDto } from './dto/update-layout-template.dto';
import type { TemplateType } from './schemas/layout-template.schema';

@Controller('layout-templates')
export class LayoutTemplatesController {
  constructor(
    private readonly config: ConfigService,
    private readonly service: LayoutTemplatesService,
  ) {}

  /**
   * ✅ FLAT: listar layouts por company (usa todos los themes de esa company)
   * GET /layout-templates/by-company?companyId=...&templateType=email&active=true&includeHtml=false
   */
  @Get('by-company')
  @HttpCode(200)
  async listByCompany(
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
    @Query('templateType') templateType?: TemplateType,
    @Query('active') active?: string,
    @Query('includeHtml') includeHtml?: string,
    @Query('populateTheme') populateTheme?: string,
    @Query('populateCompany') populateCompany?: string,
  ) {
    this.assertApiKey(apiKey);

    return this.service.findAllByCompanyFlat({
      companyId,
      templateType,
      active: this.toBool(active),
      includeHtml: this.toBool(includeHtml) ?? false,
      populateTheme: this.toBool(populateTheme) ?? true,
      populateCompany: this.toBool(populateCompany) ?? true,
    });
  }

  /**
   * ✅ DEFAULT (runtime/report): companyId + templateType → default theme activo → default layout activo
   * GET /layout-templates/default-by-company?companyId=...&templateType=email
   */
  @Get('default-by-company')
  @HttpCode(200)
  async getDefaultByCompany(
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
    @Query('templateType') templateType: TemplateType,
    @Query('populateTheme') populateTheme?: string,
    @Query('populateCompany') populateCompany?: string,
  ) {
    this.assertApiKey(apiKey);

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
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
    @Query('includeHtml') includeHtml?: string,
  ) {
    this.assertApiKey(apiKey);

    return this.service.getCompanyOverview({
      companyId,
      includeHtml: this.toBool(includeHtml) ?? false,
    });
  }

  @Get(':id')
  @HttpCode(200)
  async getById(@Headers('x-api-key') apiKey: string, @Param('id') id: string) {
    this.assertApiKey(apiKey);

    return this.service.getByIdWithContext({
      id,
      populateTheme: true,
      populateCompany: true,
    });
  }

  @Post()
  @HttpCode(201)
  async create(
    @Headers('x-api-key') apiKey: string,
    @Body() dto: CreateLayoutTemplateDto,
  ) {
    this.assertApiKey(apiKey);
    return this.service.create(dto);
  }

  // ─────────────────────────────────────────────
  // ✅ RUTAS DINÁMICAS AL FINAL
  // ─────────────────────────────────────────────

  @Patch(':id')
  @HttpCode(200)
  async update(
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
    @Body() dto: UpdateLayoutTemplateDto,
  ) {
    this.assertApiKey(apiKey);
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Headers('x-api-key') apiKey: string, @Param('id') id: string) {
    this.assertApiKey(apiKey);
    return this.service.remove(id);
  }

  private assertApiKey(apiKey?: string) {
    const expected = this.config.get<string>('COMMUNICATION_API_KEY');
    if (!apiKey || !expected || apiKey !== expected) {
      throw new UnauthorizedException('Invalid API key');
    }
  }

  private toBool(v?: string) {
    if (v === undefined) return undefined;
    return v === 'true' || v === '1';
  }
}
