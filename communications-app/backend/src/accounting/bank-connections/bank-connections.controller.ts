// src/accounting/bank-connections/bank-connections.controller.ts

import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import { AccountingProviderRegistry } from '../registry/accounting-provider.registry';
import { isAccountingBankConnectionsProvider } from '../interfaces/accounting-provider.interface';

import {
  BankConnectionsService,
  type BankConnectionResponse,
} from './bank-connections.service';
import { ListBankConnectionsQueryDto } from './dto/list-bank-connections.dto';
import type { AccountingListResult } from '../types/accounting.types';

@ApiTags('Accounting — Bank Connections')
@ApiBearerAuth()
@Controller('accounting/bank-connections')
export class BankConnectionsController {
  constructor(
    private readonly service: BankConnectionsService,
    private readonly registry: AccountingProviderRegistry,
  ) {}

  // ─── GET /accounting/bank-connections/providers ───────────────────────────
  // Returns only providers that declare the bankConnections capability.
  // Static route must appear before the :id param route.

  @Get('providers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List providers that support Open Banking connections',
    description:
      'Returns registered accounting providers that declare the ' +
      'bankConnections capability as available. ' +
      'The list is empty until at least one Open Banking provider is registered.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Provider list' })
  listProviders(): {
    data: { providerKey: string; displayName: string }[];
    total: number;
  } {
    const data = this.registry
      .listAll()
      .filter(isAccountingBankConnectionsProvider)
      .map((p) => ({ providerKey: p.providerKey, displayName: p.displayName }));

    return { data, total: data.length };
  }

  // ─── GET /accounting/bank-connections ─────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List bank connections for the authenticated company',
  })
  @ApiQuery({
    name: 'provider',
    required: false,
    description: 'Filter by provider key',
  })
  @ApiQuery({
    name: 'institution',
    required: false,
    description: 'Filter by institution name',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by connection status',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search institution name',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max results (1–100)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bank connection list' })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No company context',
  })
  async list(
    @CurrentUser() ctx: AuthContext,
    @Query() query: ListBankConnectionsQueryDto,
  ): Promise<AccountingListResult<BankConnectionResponse>> {
    const companyId = this.resolveCompanyId(ctx);
    return this.service.list(companyId, query);
  }

  // ─── GET /accounting/bank-connections/:id ─────────────────────────────────

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single bank connection by ID' })
  @ApiParam({ name: 'id', description: 'BankConnection._id' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bank connection detail' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Connection not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No company context',
  })
  async findOne(
    @CurrentUser() ctx: AuthContext,
    @Param('id') id: string,
  ): Promise<BankConnectionResponse> {
    const companyId = this.resolveCompanyId(ctx);
    const result = await this.service.findOne(companyId, id);
    if (!result) {
      throw new NotFoundException(`Bank connection "${id}" not found.`);
    }
    return result;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private resolveCompanyId(ctx: AuthContext): string {
    if (!ctx?.companyId) {
      throw new UnauthorizedException(
        'No company context in authentication token.',
      );
    }
    return ctx.companyId;
  }
}
