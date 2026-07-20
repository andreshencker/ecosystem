import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { toContractResponse } from './dto/contract-response.dto';
import { CurrentUser } from '../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';

@ApiTags('Contracts')
@ApiBearerAuth()
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contracts: ContractsService) {}

  private resolveContext(ctx: AuthContext) {
    if (!ctx.companyId)
      throw new ForbiddenException('No business assigned to this account');
    return {
      businessId: ctx.companyId,
      actor: {
        email: ctx.email ?? '',
        firstName: (ctx as any).firstName ?? '',
        companyId: ctx.companyId,
      },
    };
  }

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'List contracts for the authenticated business' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @CurrentUser() ctx: AuthContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const { businessId } = this.resolveContext(ctx);
    const result = await this.contracts.findAll(businessId, {
      page:  Math.max(1, Number(page  ?? 1)),
      limit: Math.min(100, Math.max(1, Number(limit ?? 20))),
      customerId,
      status,
      search,
    });
    return { ...result, items: result.items.map(toContractResponse) };
  }

  @Get(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get a contract by ID' })
  async findOne(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    const { businessId } = this.resolveContext(ctx);
    const doc = await this.contracts.findById(id, businessId);
    if (!doc) throw new NotFoundException('Contract not found');
    return toContractResponse(doc);
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a new contract (status=active)' })
  async create(@CurrentUser() ctx: AuthContext, @Body() dto: CreateContractDto) {
    const { businessId, actor } = this.resolveContext(ctx);
    const doc = await this.contracts.create(businessId, dto, actor);
    return toContractResponse(doc);
  }

  @Patch(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update a contract' })
  async update(
    @CurrentUser() ctx: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateContractDto,
  ) {
    const { businessId, actor } = this.resolveContext(ctx);
    const doc = await this.contracts.update(id, businessId, dto, actor);
    return toContractResponse(doc);
  }

  @Patch(':id/activate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Activate a contract (draft → active or inactive → active)' })
  async activate(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    const { businessId, actor } = this.resolveContext(ctx);
    const doc = await this.contracts.activate(id, businessId, actor);
    return toContractResponse(doc);
  }

  @Patch(':id/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel a contract' })
  async cancel(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    const { businessId, actor } = this.resolveContext(ctx);
    const doc = await this.contracts.cancel(id, businessId, actor);
    return toContractResponse(doc);
  }

  @Patch(':id/finish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark a contract as finished (active → finished)' })
  async finish(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    const { businessId, actor } = this.resolveContext(ctx);
    const doc = await this.contracts.finish(id, businessId, actor);
    return toContractResponse(doc);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete a draft contract permanently' })
  async remove(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    const { businessId } = this.resolveContext(ctx);
    await this.contracts.remove(id, businessId);
    return { deleted: true };
  }
}
