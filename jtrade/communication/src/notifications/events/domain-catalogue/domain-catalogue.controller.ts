// src/domain-catalogue/domain-catalogue.controller.ts
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

import { DomainCatalogueService } from './domain-catalogue.service';
import { CreateDomainCatalogueDto } from './dto/create-domain-catalogue.dto';
import { UpdateDomainCatalogueDto } from './dto/update-domain-catalogue.dto';

@Controller('domain-catalogue')
export class DomainCatalogueController {
  constructor(
    private readonly config: ConfigService,
    private readonly service: DomainCatalogueService,
  ) {}

  @Post()
  @HttpCode(201)
  async create(
    @Headers('x-api-key') apiKey: string,
    @Body() dto: CreateDomainCatalogueDto,
  ) {
    this.assertApiKey(apiKey);
    return this.service.create(dto);
  }

  @Get()
  @HttpCode(200)
  async list(
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
    @Query('active') active?: string,
  ) {
    this.assertApiKey(apiKey);
    return this.service.findAll({ companyId, active: this.toBool(active) });
  }

  // =========================================================
  @Patch('bulk/credentials')
  @HttpCode(200)
  async bulkUpdateCredentials(
    @Headers('x-api-key') apiKey: string,
    @Body()
    body: {
      companyId: string;
      domainIds: string[];
      channel: 'email' | 'sms';
      providerCredentialsId: string;
    },
  ) {
    this.assertApiKey(apiKey);

    return this.service.bulkUpdateDomainsCredential({
      companyId: String(body?.companyId ?? ''),
      domainIds: Array.isArray(body?.domainIds) ? body.domainIds : [],
      channel: this.normalizeChannel(body?.channel as any),
      providerCredentialsId: String(body?.providerCredentialsId ?? ''),
    });
  }

  // ==========================
  // CRUD existente
  // ==========================

  @Get(':id')
  @HttpCode(200)
  async getById(@Headers('x-api-key') apiKey: string, @Param('id') id: string) {
    this.assertApiKey(apiKey);
    return this.service.getById(id);
  }

  @Patch(':id')
  @HttpCode(200)
  async update(
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
    @Body() dto: UpdateDomainCatalogueDto,
  ) {
    this.assertApiKey(apiKey);
    return this.service.update(id, dto);
  }

  // =========================================================
  // ✅ NUEVO: Cambiar credencial para varios dominios (bulk)
  // ⚠️ DEBE ir antes de /:id
  // PATCH /domain-catalogue/bulk/credentials

  @Delete(':id')
  @HttpCode(200)
  async remove(@Headers('x-api-key') apiKey: string, @Param('id') id: string) {
    this.assertApiKey(apiKey);
    return this.service.remove(id);
  }

  // =========================================================
  @Get(':id/credentials')
  @HttpCode(200)
  async getCredentials(
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
  ) {
    this.assertApiKey(apiKey);
    return this.service.getDomainCredentials(id);
  }

  // =========================================================
  @Patch(':id/credentials/:channel')
  @HttpCode(200)
  async updateCredential(
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
    @Param('channel') channel: string,
    @Body() body: { providerCredentialsId: string },
  ) {
    this.assertApiKey(apiKey);

    return this.service.updateDomainCredential({
      domainId: id,
      channel: this.normalizeChannel(channel),
      providerCredentialsId: String(body?.providerCredentialsId ?? ''),
    });
  }

  private assertApiKey(apiKey: string) {
    const expected = this.config.get<string>('COMMUNICATION_API_KEY');
    if (!apiKey || !expected || apiKey !== expected) {
      throw new UnauthorizedException('Invalid API key');
    }
  }

  // =========================================================
  // ✅ NUEVO: Ver credenciales asociadas al dominio
  // GET /domain-catalogue/:id/credentials

  private toBool(v?: string) {
    if (v === undefined) return undefined;
    return v === 'true' || v === '1';
  }

  // =========================================================
  // ✅ NUEVO: Cambiar credencial de un dominio por canal
  // PATCH /domain-catalogue/:id/credentials/:channel

  private normalizeChannel(v: string): 'email' | 'sms' {
    const s = String(v ?? '')
      .toLowerCase()
      .trim();
    if (s !== 'email' && s !== 'sms') {
      throw new UnauthorizedException('Invalid channel'); // o BadRequestException si prefieres
    }
    return s;
  }
}
