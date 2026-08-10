// src/accounting/controllers/accounting-bank-transactions.controller.ts

import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Query,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
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

import {
  AccountingCapabilityNotSupportedError,
  AccountingCredentialChannelMismatchError,
  AccountingProviderNotFoundError,
  AccountingProviderNotConfiguredError,
  AccountingProviderCredentialsUnavailableError,
  AccountingProviderUnavailableError,
  AccountingResourceNotFoundError,
} from '../errors/accounting.errors';

import type { BankTransactionSummary } from '../types/accounting.types';
import type { AccountingListResult } from '../types/accounting.types';
import { ListBankTransactionsQueryDto } from '../dto/list-bank-transactions.dto';
import { AccountingBankTransactionsService } from '../services/accounting-bank-transactions.service';

@ApiTags('Accounting — Bank Transactions')
@ApiBearerAuth()
@Controller(
  'accounting/banking/:credentialId/accounts/:bankAccountId/transactions',
)
export class AccountingBankTransactionsController {
  constructor(
    private readonly bankTransactionsService: AccountingBankTransactionsService,
  ) {}

  // ─── GET /accounting/banking/:credentialId/accounts/:bankAccountId/transactions

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List bank transactions for a specific bank account',
    description:
      'Returns transactions from the provider for the given BANK account. ' +
      'For Xero this requires the accounting.banktransactions.read OAuth scope. ' +
      'Xero uses page-based pagination (100 records per page); pass the ' +
      'nextCursor value as cursor to fetch the next page.',
  })
  @ApiParam({ name: 'credentialId', description: 'ProviderCredentials._id' })
  @ApiParam({
    name: 'bankAccountId',
    description: 'Provider BANK account ID (e.g. Xero AccountID)',
  })
  @ApiQuery({ name: 'organisationId', required: false })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Page cursor (Xero: page number)',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    description: 'YYYY-MM-DD inclusive lower bound',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    description: 'YYYY-MM-DD inclusive upper bound',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'authorised | deleted | all',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Transaction list' })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No company context',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Provider not configured or capability not supported',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Provider unavailable or OAuth scope missing',
  })
  async listBankTransactions(
    @CurrentUser() ctx: AuthContext,
    @Param('credentialId') credentialId: string,
    @Param('bankAccountId') bankAccountId: string,
    @Query() query: ListBankTransactionsQueryDto,
    @Query('organisationId') organisationId?: string,
  ): Promise<AccountingListResult<BankTransactionSummary>> {
    const companyId = this.resolveCompanyId(ctx);
    return this.bankTransactionsService
      .listBankTransactions(
        companyId,
        credentialId,
        bankAccountId,
        query,
        organisationId,
      )
      .catch((err: unknown): never => this.mapDomainError(err));
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private resolveCompanyId(ctx: AuthContext): string {
    if (!ctx?.companyId) {
      throw new UnauthorizedException(
        'No company context in authentication token.',
      );
    }
    return ctx.companyId;
  }

  private mapDomainError(err: unknown): never {
    if (err instanceof AccountingResourceNotFoundError) {
      throw new NotFoundException(err.message);
    }
    if (err instanceof AccountingProviderNotFoundError) {
      throw new NotFoundException(err.message);
    }
    if (
      err instanceof AccountingProviderNotConfiguredError ||
      err instanceof AccountingProviderCredentialsUnavailableError ||
      err instanceof AccountingCredentialChannelMismatchError ||
      err instanceof AccountingCapabilityNotSupportedError
    ) {
      throw new UnprocessableEntityException(err.message);
    }
    if (err instanceof AccountingProviderUnavailableError) {
      throw new ServiceUnavailableException(err.message);
    }
    throw err;
  }
}
