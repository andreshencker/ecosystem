// src/accounting/controllers/accounting-chart-of-accounts.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
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
  AccountingSystemAccountError,
  AccountingAccountCannotBeDeletedError,
  AccountingValidationError,
  AccountingDuplicateCodeError,
  AccountingReauthorisationRequiredError,
} from '../errors/accounting.errors';

import type {
  AccountSummary,
  AccountDetail,
  AccountingListResult,
  ArchiveAccountResult,
  DeleteAccountResult,
} from '../types/accounting.types';

import { ListAccountsQueryDto } from '../dto/list-accounts.dto';
import { CreateAccountDto } from '../dto/create-account.dto';
import { UpdateAccountDto } from '../dto/update-account.dto';
import { AccountingChartOfAccountsService } from '../services/accounting-chart-of-accounts.service';

@ApiTags('Accounting — Chart of Accounts')
@ApiBearerAuth()
@Controller('accounting/chart-of-accounts/:credentialId/accounts')
export class AccountingChartOfAccountsController {
  constructor(private readonly service: AccountingChartOfAccountsService) {}

  // ─── GET (list) ───────────────────────────────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List accounts from the Chart of Accounts' })
  @ApiParam({ name: 'credentialId', example: '6776e4f1a0c1234567890abc' })
  @ApiQuery({ name: 'organisationId', required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'Account list' })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No company context',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Provider not configured',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Provider unavailable',
  })
  async listAccounts(
    @CurrentUser() ctx: AuthContext,
    @Param('credentialId') credentialId: string,
    @Query() query: ListAccountsQueryDto,
    @Query('organisationId') organisationId?: string,
  ): Promise<AccountingListResult<AccountSummary>> {
    const companyId = this.resolveCompanyId(ctx);
    return this.service
      .listAccounts(
        companyId,
        credentialId,
        {
          limit: query.limit,
          cursor: query.cursor,
          search: query.search,
          type: query.type,
          status: query.status,
        },
        organisationId,
      )
      .catch((err) => this.mapError(err));
  }

  // ─── GET (single) ─────────────────────────────────────────────────────────────

  @Get(':accountId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single account by ID' })
  @ApiParam({ name: 'credentialId' })
  @ApiParam({ name: 'accountId' })
  @ApiQuery({ name: 'organisationId', required: false })
  async getAccount(
    @CurrentUser() ctx: AuthContext,
    @Param('credentialId') credentialId: string,
    @Param('accountId') accountId: string,
    @Query('organisationId') organisationId?: string,
  ): Promise<AccountDetail> {
    const companyId = this.resolveCompanyId(ctx);
    return this.service
      .getAccount(companyId, credentialId, accountId, organisationId)
      .catch((err) => this.mapError(err));
  }

  // ─── POST (create) ────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an account in the Chart of Accounts' })
  @ApiParam({ name: 'credentialId' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Account created' })
  async createAccount(
    @CurrentUser() ctx: AuthContext,
    @Param('credentialId') credentialId: string,
    @Body() dto: CreateAccountDto,
  ): Promise<AccountDetail> {
    const companyId = this.resolveCompanyId(ctx);
    const { organisationId, ...params } = dto;
    return this.service
      .createAccount(companyId, credentialId, params, organisationId)
      .catch((err) => this.mapError(err));
  }

  // ─── PATCH (update) ───────────────────────────────────────────────────────────

  @Patch(':accountId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an account' })
  @ApiParam({ name: 'credentialId' })
  @ApiParam({ name: 'accountId' })
  async updateAccount(
    @CurrentUser() ctx: AuthContext,
    @Param('credentialId') credentialId: string,
    @Param('accountId') accountId: string,
    @Body() dto: UpdateAccountDto,
  ): Promise<AccountDetail> {
    const companyId = this.resolveCompanyId(ctx);
    const { organisationId, ...params } = dto;
    return this.service
      .updateAccount(companyId, credentialId, accountId, params, organisationId)
      .catch((err) => this.mapError(err));
  }

  // ─── POST /archive ────────────────────────────────────────────────────────────

  @Post(':accountId/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive an account (Status=ARCHIVED)' })
  @ApiParam({ name: 'credentialId' })
  @ApiParam({ name: 'accountId' })
  async archiveAccount(
    @CurrentUser() ctx: AuthContext,
    @Param('credentialId') credentialId: string,
    @Param('accountId') accountId: string,
    @Query('organisationId') organisationId?: string,
  ): Promise<ArchiveAccountResult> {
    const companyId = this.resolveCompanyId(ctx);
    return this.service
      .archiveAccount(companyId, credentialId, accountId, organisationId)
      .catch((err) => this.mapError(err));
  }

  // ─── DELETE ───────────────────────────────────────────────────────────────────

  @Delete(':accountId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an account (when provider permits)' })
  @ApiParam({ name: 'credentialId' })
  @ApiParam({ name: 'accountId' })
  async deleteAccount(
    @CurrentUser() ctx: AuthContext,
    @Param('credentialId') credentialId: string,
    @Param('accountId') accountId: string,
    @Query('organisationId') organisationId?: string,
  ): Promise<DeleteAccountResult> {
    const companyId = this.resolveCompanyId(ctx);
    return this.service
      .deleteAccount(companyId, credentialId, accountId, organisationId)
      .catch((err) => this.mapError(err));
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

  private mapError(err: unknown): never {
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
    if (err instanceof AccountingSystemAccountError) {
      throw new UnprocessableEntityException(err.message);
    }
    if (err instanceof AccountingAccountCannotBeDeletedError) {
      throw new UnprocessableEntityException(err.message);
    }
    if (err instanceof AccountingValidationError) {
      throw new UnprocessableEntityException(err.message);
    }
    if (err instanceof AccountingDuplicateCodeError) {
      throw new UnprocessableEntityException(err.message);
    }
    if (err instanceof AccountingReauthorisationRequiredError) {
      throw new UnauthorizedException(err.message);
    }
    if (err instanceof AccountingProviderUnavailableError) {
      throw new ServiceUnavailableException(err.message);
    }
    throw err;
  }
}
