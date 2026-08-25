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
import { DocumentDomainCatalogueService } from './document-domain-catalogue.service';
import { CreateDocumentDomainCatalogueDto } from './dto/create-document-domain-catalogue.dto';
import { UpdateDocumentDomainCatalogueDto } from './dto/update-document-domain-catalogue.dto';

@ApiTags('Document Domain Catalogue')
@Controller('document-domain-catalogue')
export class DocumentDomainCatalogueController {
  constructor(
    private readonly config: ConfigService,
    private readonly service: DocumentDomainCatalogueService,
    private readonly tenantContext: RelayTenantContextService,
  ) {}

  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Body() dto: CreateDocumentDomainCatalogueDto,
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
  @ApiOperation({ summary: 'List document domain catalogue entries' })
  @ApiQuery({ name: 'companyId', required: true, type: String })
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

  @Get('key/:domainKey')
  @HttpCode(200)
  async getByKey(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
    @Param('domainKey') domainKey: string,
  ) {
    companyId = await this.resolveCompanyId(
      ctx,
      apiKey,
      companyId,
      'relay.use',
    );
    return this.service.getByCompanyAndDomainKey({ companyId, domainKey });
  }

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
    @Body() dto: UpdateDocumentDomainCatalogueDto,
  ) {
    await this.assertDomainAccess(ctx, apiKey, id, 'relay.use');
    return this.service.update(id, dto);
  }

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

  private assertApiKey(apiKey: string) {
    const expected = this.config.get<string>('RELAY_API_KEY');
    if (!apiKey || !expected || apiKey !== expected)
      throw new UnauthorizedException('Invalid API key');
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
      await this.service.assertDocumentDomainBelongsToCompany(
        domainId,
        companyId,
      );
    }
  }

  private toBool(v?: string) {
    if (v === undefined) return undefined;
    return v === 'true' || v === '1';
  }
}
