// src/company-theme/company-theme.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { parsePagination } from '../../common/pagination/pagination.util';
import { CurrentUser } from '../../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../../infrastructure/security/types/auth-context.types';
import { RelayTenantContextService } from '../../../infrastructure/security/services/relay-tenant-context.service';

import { CompanyThemeService } from './company-theme.service';
import { CreateCompanyThemeDto } from './dto/create-company-theme.dto';
import { UpdateCompanyThemeDto } from './dto/update-company-theme.dto';

@ApiTags('Company Theme')
@ApiBearerAuth()
@Controller('company-themes')
export class CompanyThemeController {
  constructor(
    private readonly service: CompanyThemeService,
    private readonly tenantContext: RelayTenantContextService,
  ) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'List company themes' })
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
    @Query('active') active?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const { companyId, grapiflyOrganizationId } =
      await this.tenantContext.resolve(ctx, 'relay.use');
    const activeBool = active === undefined ? undefined : active === 'true';
    const { limit: parsedLimit, offset: parsedOffset } = parsePagination(
      limit,
      offset,
    );
    return this.service.findAll({
      companyId,
      grapiflyOrganizationId,
      active: activeBool,
      limit: parsedLimit,
      offset: parsedOffset,
    });
  }

  @Get(':id')
  @HttpCode(200)
  async getById(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    const { companyId, grapiflyOrganizationId } =
      await this.tenantContext.resolve(ctx, 'relay.use');
    return this.service.findById({ companyId, grapiflyOrganizationId }, id);
  }

  @Post()
  @HttpCode(200)
  async create(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: CreateCompanyThemeDto,
  ) {
    const { companyId, grapiflyOrganizationId } =
      await this.tenantContext.resolve(ctx, 'relay.theme.manage');
    return this.service.create({ companyId, grapiflyOrganizationId }, dto);
  }

  @Put(':id')
  @HttpCode(200)
  async update(
    @CurrentUser() ctx: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyThemeDto,
  ) {
    const { companyId, grapiflyOrganizationId } =
      await this.tenantContext.resolve(ctx, 'relay.theme.manage');
    return this.service.updateById(
      { companyId, grapiflyOrganizationId },
      id,
      dto,
    );
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    const { companyId, grapiflyOrganizationId } =
      await this.tenantContext.resolve(ctx, 'relay.theme.manage');
    return this.service.removeById({ companyId, grapiflyOrganizationId }, id);
  }
}
