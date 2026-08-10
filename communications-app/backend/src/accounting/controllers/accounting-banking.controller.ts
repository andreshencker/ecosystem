// src/accounting/controllers/accounting-banking.controller.ts

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

import type { BankAccountSummary } from '../types/accounting.types';
import type {
  BankAccountDetail,
  BankAccountBalance,
} from '../contracts/banking/accounting-bank-account.contract';
import type { AccountingListResult } from '../types/accounting.types';
import { ListBankAccountsQueryDto } from '../dto/list-bank-accounts.dto';
import { AccountingBankingService } from '../services/accounting-banking.service';

// ─── HTTP serialisation helpers ───────────────────────────────────────────────

type BankAccountBalanceHttpResponse = Omit<
  BankAccountBalance,
  'retrievedAt'
> & {
  retrievedAt: string;
};

function toBalanceResponse(
  balance: BankAccountBalance,
): BankAccountBalanceHttpResponse {
  return { ...balance, retrievedAt: balance.retrievedAt.toISOString() };
}

// ─── Controller ───────────────────────────────────────────────────────────────

@ApiTags('Accounting — Banking')
@ApiBearerAuth()
@Controller('accounting/banking/:credentialId/accounts')
export class AccountingBankingController {
  constructor(private readonly bankingService: AccountingBankingService) {}

  // ─── GET /accounting/banking/:credentialId/accounts ──────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List bank accounts for an Accounting connection and organisation',
    description:
      'Returns bank accounts from the selected Accounting organisation. ' +
      'The organisationId must be a Communications organisation ID obtained ' +
      'from GET /accounting/oauth/xero/connections/:credentialId/organisations. ' +
      'By default only active accounts are returned.',
  })
  @ApiParam({
    name: 'credentialId',
    description:
      'ProviderCredentials._id (the Xero OAuth connection identifier)',
    example: '6776e4f1a0c1234567890abc',
  })
  @ApiQuery({
    name: 'organisationId',
    required: false,
    description:
      'Communications organisation ID. Required when the connection authorises ' +
      'multiple Xero organisations. Omit only for legacy single-organisation connections.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Filter by account name',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max results (1–100)',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Pagination cursor',
  })
  @ApiQuery({
    name: 'includeArchived',
    required: false,
    description: 'Include archived/inactive accounts (default: false)',
  })
  @ApiQuery({
    name: 'withBalances',
    required: false,
    description:
      'When true, fetches GET /Reports/BankSummary once and attaches ' +
      'xeroBalance and statementBalance to each account summary. ' +
      'Adds one parallel Xero API call — no per-row N+1 cost.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bank account list' })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No company context',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Provider not configured or org not found',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Provider unavailable',
  })
  async listBankAccounts(
    @CurrentUser() ctx: AuthContext,
    @Param('credentialId') credentialId: string,
    @Query() query: ListBankAccountsQueryDto,
    @Query('organisationId') organisationId?: string,
  ): Promise<AccountingListResult<BankAccountSummary>> {
    const companyId = this.resolveCompanyId(ctx);

    return this.bankingService
      .listBankAccounts(companyId, credentialId, query, organisationId)
      .catch((err: unknown): never => this.mapDomainError(err));
  }

  // ─── GET /accounting/banking/:credentialId/accounts/:accountId ───────────────

  @Get(':accountId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a bank account by ID',
    description:
      'Retrieves the full detail of a single bank account from the provider. ' +
      'Makes one live API call — never cached.',
  })
  @ApiParam({
    name: 'credentialId',
    description: 'ProviderCredentials._id (the Xero connection identifier)',
    example: '6776e4f1a0c1234567890abc',
  })
  @ApiParam({
    name: 'accountId',
    description: 'Provider bank account identifier (e.g. Xero AccountID UUID)',
    example: 'a6dc1468-9e9e-4a2e-b3b7-8e2f7b4c1234',
  })
  @ApiQuery({ name: 'organisationId', required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bank account detail' })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No company context',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Bank account not found',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Provider not configured',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Provider unavailable',
  })
  async getBankAccount(
    @CurrentUser() ctx: AuthContext,
    @Param('credentialId') credentialId: string,
    @Param('accountId') accountId: string,
    @Query('organisationId') organisationId?: string,
  ): Promise<BankAccountDetail> {
    const companyId = this.resolveCompanyId(ctx);

    return this.bankingService
      .getBankAccount(companyId, credentialId, accountId, organisationId)
      .catch((err: unknown): never => this.mapDomainError(err));
  }

  // ─── GET /accounting/banking/:credentialId/accounts/:accountId/balance ────────

  @Get(':accountId/balance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get current balance for a bank account',
    description:
      'Returns the statement balance (from imported bank records) and the ' +
      'Xero balance (calculated from recorded transactions) for the account. ' +
      'Makes live API calls to the provider — never cached.',
  })
  @ApiParam({
    name: 'credentialId',
    description: 'ProviderCredentials._id (the Xero connection identifier)',
    example: '6776e4f1a0c1234567890abc',
  })
  @ApiParam({
    name: 'accountId',
    description: 'Provider bank account identifier (e.g. Xero AccountID UUID)',
    example: 'a6dc1468-9e9e-4a2e-b3b7-8e2f7b4c1234',
  })
  @ApiQuery({ name: 'organisationId', required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bank account balance' })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No company context',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Bank account not found',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Provider not configured',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Provider unavailable',
  })
  async getBankAccountBalance(
    @CurrentUser() ctx: AuthContext,
    @Param('credentialId') credentialId: string,
    @Param('accountId') accountId: string,
    @Query('organisationId') organisationId?: string,
  ): Promise<BankAccountBalanceHttpResponse> {
    const companyId = this.resolveCompanyId(ctx);

    const balance = await this.bankingService
      .getBankAccountBalance(companyId, credentialId, accountId, organisationId)
      .catch((err: unknown): never => this.mapDomainError(err));

    return toBalanceResponse(balance);
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
