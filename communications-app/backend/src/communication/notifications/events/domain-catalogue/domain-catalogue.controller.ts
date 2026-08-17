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
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { parsePagination } from '../../../common/pagination/pagination.util';
import { CurrentUser } from '../../../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../../../infrastructure/security/types/auth-context.types';
import { RelayTenantContextService } from '../../../../infrastructure/security/services/relay-tenant-context.service';

import { DomainCatalogueService } from './domain-catalogue.service';
import { CreateDomainCatalogueDto } from './dto/create-domain-catalogue.dto';
import { UpdateDomainCatalogueDto } from './dto/update-domain-catalogue.dto';

@ApiTags('Domain Catalogue')
@Controller('domain-catalogue')
export class DomainCatalogueController {
  constructor(
    private readonly config: ConfigService,
    private readonly service: DomainCatalogueService,
    private readonly tenantContext: RelayTenantContextService,
  ) {}

  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Body() dto: CreateDomainCatalogueDto,
  ) {
    dto.companyId = await this.resolveCompanyId(
      ctx,
      apiKey,
      dto.companyId,
      'relay.use',
    );
    return this.service.create(dto);
  }

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'List domain catalogue entries' })
  @ApiQuery({ name: 'companyId', required: true, type: String })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max records (1–200, default 50)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Records to skip (default 0)',
  })
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

  // =========================================================
  @Patch('bulk/credentials')
  @HttpCode(200)
  async bulkUpdateCredentials(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Body()
    body: {
      companyId: string;
      domainIds: string[];
      channel: 'email' | 'sms';
      providerCredentialsId: string;
    },
  ) {
    const companyId = await this.resolveCompanyId(
      ctx,
      apiKey,
      String(body?.companyId ?? ''),
      'relay.use',
    );

    return this.service.bulkUpdateDomainsCredential({
      companyId,
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
  async getById(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
  ) {
    await this.assertDomainAccess(ctx, apiKey, id, 'relay.use');
    return this.service.getById(id);
  }

  @Patch(':id')
  @HttpCode(200)
  async update(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
    @Body() dto: UpdateDomainCatalogueDto,
  ) {
    await this.assertDomainAccess(ctx, apiKey, id, 'relay.use');
    return this.service.update(id, dto);
  }

  // =========================================================
  // ✅ NUEVO: Cambiar credencial para varios dominios (bulk)
  // ⚠️ DEBE ir antes de /:id
  // PATCH /domain-catalogue/bulk/credentials

  @Delete(':id')
  @HttpCode(200)
  async remove(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
  ) {
    await this.assertDomainAccess(ctx, apiKey, id, 'relay.use');
    return this.service.remove(id);
  }

  // =========================================================
  @Get(':id/credentials')
  @HttpCode(200)
  async getCredentials(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
  ) {
    await this.assertDomainAccess(ctx, apiKey, id, 'relay.use');
    return this.service.getDomainCredentials(id);
  }

  // =========================================================
  @Patch(':id/credentials/:channel')
  @HttpCode(200)
  async updateCredential(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
    @Param('channel') channel: string,
    @Body() body: { providerCredentialsId: string },
  ) {
    await this.assertDomainAccess(ctx, apiKey, id, 'relay.use');

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

  private async assertDomainAccess(
    ctx: AuthContext,
    apiKey: string,
    domainId: string,
    permission: string,
  ): Promise<void> {
    const companyId = await this.resolveOptionalCompanyId(
      ctx,
      apiKey,
      permission,
    );
    if (companyId) {
      await this.service.assertDomainBelongsToCompany(domainId, companyId);
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
