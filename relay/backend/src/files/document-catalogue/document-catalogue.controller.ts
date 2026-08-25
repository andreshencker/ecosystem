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
import { parsePagination } from '../../communication/common/pagination/pagination.util';
import { CurrentUser } from '../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import { RelayTenantContextService } from '../../infrastructure/security/services/relay-tenant-context.service';
import { DocumentCatalogueService } from './document-catalogue.service';
import { CreateDocumentCatalogueDto } from './dto/create-document-catalogue.dto';
import { UpdateDocumentCatalogueDto } from './dto/update-document-catalogue.dto';

@ApiTags('Document Catalogue')
@Controller('document-catalogue')
export class DocumentCatalogueController {
  constructor(
    private readonly config: ConfigService,
    private readonly service: DocumentCatalogueService,
    private readonly tenantContext: RelayTenantContextService,
  ) {}

  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Body() dto: CreateDocumentCatalogueDto,
  ) {
    const companyId = await this.resolveOptionalCompanyId(
      ctx,
      apiKey,
      'relay.use',
    );
    if (companyId) {
      await this.service.assertDomainBelongsToCompany(
        dto.documentDomainCatalogueId,
        companyId,
      );
    }
    return this.service.create(dto);
  }

  @Get('resolve/:canonicalKey')
  @HttpCode(200)
  async resolve(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Param('canonicalKey') canonicalKey: string,
    @Query('companyId') companyId: string,
  ) {
    companyId = await this.resolveCompanyId(
      ctx,
      apiKey,
      companyId,
      'relay.use',
    );
    return this.service.findByCompanyAndCanonicalKey(companyId, canonicalKey);
  }

  @Get('domain/:documentDomainCatalogueId')
  @HttpCode(200)
  @ApiOperation({ summary: 'List documents for a domain' })
  async listByDomain(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Param('documentDomainCatalogueId') documentDomainCatalogueId: string,
    @Query('active') active?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const companyId = await this.resolveOptionalCompanyId(
      ctx,
      apiKey,
      'relay.use',
    );
    if (companyId) {
      await this.service.assertDomainBelongsToCompany(
        documentDomainCatalogueId,
        companyId,
      );
    }
    const { limit: parsedLimit, offset: parsedOffset } = parsePagination(
      limit,
      offset,
    );
    return this.service.findAll({
      documentDomainCatalogueId,
      active: this.toBool(active),
      populateDocumentDomain: true,
      limit: parsedLimit,
      offset: parsedOffset,
    });
  }

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'List document catalogue entries' })
  @ApiQuery({ name: 'documentDomainCatalogueId', required: true, type: String })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async list(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Query('documentDomainCatalogueId') documentDomainCatalogueId: string,
    @Query('active') active?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const companyId = await this.resolveOptionalCompanyId(
      ctx,
      apiKey,
      'relay.use',
    );
    if (companyId) {
      await this.service.assertDomainBelongsToCompany(
        documentDomainCatalogueId,
        companyId,
      );
    }
    const { limit: parsedLimit, offset: parsedOffset } = parsePagination(
      limit,
      offset,
    );
    return this.service.findAll({
      documentDomainCatalogueId,
      active: this.toBool(active),
      populateDocumentDomain: true,
      limit: parsedLimit,
      offset: parsedOffset,
    });
  }

  @Get(':id')
  @HttpCode(200)
  async getById(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
    @Query('populateDocumentDomain') populateDocumentDomain?: string,
  ) {
    const companyId = await this.resolveOptionalCompanyId(
      ctx,
      apiKey,
      'relay.use',
    );
    if (companyId) {
      await this.service.assertBelongsToCompany(id, companyId);
    }
    return this.service.getById(id, {
      populateDocumentDomain: this.toBool(populateDocumentDomain) ?? true,
    });
  }

  @Patch(':id')
  @HttpCode(200)
  async update(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentCatalogueDto,
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

  private assertApiKey(apiKey: string) {
    const expected = this.config.get<string>('RELAY_API_KEY');
    if (!apiKey || !expected || apiKey !== expected)
      throw new UnauthorizedException('Invalid API key');
  }

  private toBool(v?: string) {
    if (v === undefined) return undefined;
    return v === 'true' || v === '1';
  }
}
