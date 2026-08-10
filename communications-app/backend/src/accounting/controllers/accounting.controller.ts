// src/accounting/controllers/accounting.controller.ts

import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AccountingService } from '../services/accounting.service';
import { AccountingProviderNotFoundError } from '../errors/accounting.errors';

@ApiTags('Accounting')
@ApiBearerAuth()
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  // ─── GET /accounting/providers/:providerKey/capabilities ─────────────────────

  @Get('providers/:providerKey/capabilities')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get declared capabilities for an accounting provider',
  })
  @ApiParam({ name: 'providerKey', example: 'xero' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Provider capabilities' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Provider not registered',
  })
  getCapabilities(@Param('providerKey') providerKey: string) {
    try {
      return this.accountingService.getCapabilities(providerKey);
    } catch (err) {
      if (err instanceof AccountingProviderNotFoundError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  // ─── GET /accounting/providers ──────────────────────────────────────────────

  @Get('providers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all registered accounting providers' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Provider metadata list' })
  listProviders() {
    return this.accountingService.listProviders();
  }
}
