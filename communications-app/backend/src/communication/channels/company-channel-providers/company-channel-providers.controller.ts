// src/company-channel-providers/company-channel-providers.controller.ts
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
import { CurrentUser } from '../../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../../infrastructure/security/types/auth-context.types';
import { RelayTenantContextService } from '../../../infrastructure/security/services/relay-tenant-context.service';

import { CompanyChannelProvidersService } from './company-channel-providers.service';
import { CreateCompanyChannelProviderDto } from './dto/create-company-channel-provider.dto';
import { UpdateCompanyChannelProviderDto } from './dto/update-company-channel-provider.dto';

@ApiTags('Company Channel Providers')
@Controller('company-channel-providers')
export class CompanyChannelProvidersController {
  constructor(
    private readonly config: ConfigService,
    private readonly service: CompanyChannelProvidersService,
    private readonly tenantContext: RelayTenantContextService,
  ) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'List company channel providers' })
  @ApiQuery({ name: 'companyId', required: true, type: String })
  @ApiQuery({ name: 'channelId', required: false, type: String })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiQuery({ name: 'isDefault', required: false, type: Boolean })
  @ApiQuery({ name: 'populate', required: false, type: Boolean })
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
    @Query('channelId') channelId?: string,
    @Query('active') active?: string,
    @Query('isDefault') isDefault?: string,
    @Query('populate') populate?: string,
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
      channelId,
      active: this.toBool(active),
      isDefault: this.toBool(isDefault),
      populate: this.toBool(populate) ?? true,
      limit: parsedLimit,
      offset: parsedOffset,
    });
  }

  @Get('default/by-channel')
  @HttpCode(200)
  async getDefaultByChannel(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
    @Query('channelId') channelId: string,
    @Query('populate') populate?: string,
  ) {
    companyId = await this.resolveCompanyId(
      ctx,
      apiKey,
      companyId,
      'relay.use',
    );

    return this.service.findDefaultByChannel({
      companyId,
      channelId,
      populate: this.toBool(populate) ?? true,
    });
  }

  @Get(':id')
  @HttpCode(200)
  async getById(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
    @Query('populate') populate?: string,
  ) {
    const companyId = await this.resolveOptionalCompanyId(
      ctx,
      apiKey,
      'relay.use',
    );
    return this.service.findById(id, this.toBool(populate) ?? true, companyId);
  }

  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Body() dto: CreateCompanyChannelProviderDto,
  ) {
    dto.companyId = await this.resolveCompanyId(
      ctx,
      apiKey,
      dto.companyId,
      'relay.connections.manage',
    );
    return this.service.create(dto);
  }

  @Patch(':id')
  @HttpCode(200)
  async update(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyChannelProviderDto,
  ) {
    const companyId = await this.resolveOptionalCompanyId(
      ctx,
      apiKey,
      'relay.connections.manage',
    );
    return this.service.update(id, dto, companyId);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiQuery({
    name: 'force',
    required: false,
    type: Boolean,
    description: 'Cascade-delete related credentials',
  })
  async remove(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
    @Query('force') force?: string,
  ) {
    const companyId = await this.resolveOptionalCompanyId(
      ctx,
      apiKey,
      'relay.connections.manage',
    );
    return this.service.remove(id, this.toBool(force) ?? false, companyId);
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
    const expected = this.config.get<string>('COMMUNICATION_API_KEY');

    if (!apiKey || !expected || apiKey !== expected) {
      throw new UnauthorizedException('Invalid API key');
    }
  }

  private toBool(v?: string): boolean | undefined {
    if (typeof v !== 'string') return undefined;

    const s = v.toLowerCase().trim();
    return s === 'true' || s === '1';
  }
}
