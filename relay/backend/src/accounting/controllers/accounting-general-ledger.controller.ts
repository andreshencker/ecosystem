// src/accounting/controllers/accounting-general-ledger.controller.ts
//
// General Ledger — read-only view of accounting journal entries.
//
// Uses the provider's native Journals resource (Xero: GET /api.xro/2.0/Journals).
// Entirely separate from ManualJournals — no create, update, or delete operations.
// Required Xero scope: accounting.journals.read

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
  AccountingProviderNotConfiguredError,
  AccountingProviderNotFoundError,
  AccountingProviderCredentialsUnavailableError,
  AccountingProviderUnavailableError,
  AccountingResourceNotFoundError,
  AccountingReauthorisationRequiredError,
} from '../errors/accounting.errors';

import type {
  JournalSummary,
  AccountingListResult,
} from '../types/accounting.types';
import { ListJournalsQueryDto } from '../dto/list-journals.dto';
import { AccountingGeneralLedgerService } from '../services/accounting-general-ledger.service';

@ApiTags('Accounting — General Ledger')
@ApiBearerAuth()
@Controller('accounting/general-ledger/:credentialId')
export class AccountingGeneralLedgerController {
  constructor(
    private readonly generalLedgerService: AccountingGeneralLedgerService,
  ) {}

  // ─── GET /accounting/general-ledger/:credentialId/journals ───────────────────

  @Get('journals')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List general ledger journals',
    description:
      "Returns accounting journal entries from the provider's general ledger (read-only). " +
      'For Xero this uses GET /api.xro/2.0/Journals and requires accounting.journals.read. ' +
      'This endpoint is separate from Manual Journals — it cannot create or modify records.',
  })
  @ApiParam({ name: 'credentialId', description: 'ProviderCredentials._id' })
  @ApiQuery({ name: 'organisationId', required: false })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Pagination cursor (offset-based)',
  })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({
    name: 'sourceType',
    required: false,
    description: 'e.g. ACCREC, ACCPAY, MANUALADJUSTMENT',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Journal list' })
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
  async listJournals(
    @CurrentUser() ctx: AuthContext,
    @Param('credentialId') credentialId: string,
    @Query() query: ListJournalsQueryDto,
    @Query('organisationId') organisationId?: string,
  ): Promise<AccountingListResult<JournalSummary>> {
    const companyId = this.resolveCompanyId(ctx);
    return this.generalLedgerService
      .listJournals(companyId, credentialId, query, organisationId)
      .catch((err: unknown): never => this.mapDomainError(err));
  }

  // ─── GET /accounting/general-ledger/:credentialId/journals/:journalId ────────

  @Get('journals/:journalId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a single general ledger journal by provider ID',
  })
  @ApiParam({ name: 'credentialId', description: 'ProviderCredentials._id' })
  @ApiParam({ name: 'journalId', description: 'Provider journal ID' })
  @ApiQuery({ name: 'organisationId', required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'Journal detail' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Journal not found',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Provider unavailable',
  })
  async getJournal(
    @CurrentUser() ctx: AuthContext,
    @Param('credentialId') credentialId: string,
    @Param('journalId') journalId: string,
    @Query('organisationId') organisationId?: string,
  ): Promise<JournalSummary> {
    const companyId = this.resolveCompanyId(ctx);
    return this.generalLedgerService
      .getJournal(companyId, credentialId, journalId, organisationId)
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
    if (
      err instanceof AccountingReauthorisationRequiredError ||
      err instanceof AccountingProviderUnavailableError
    ) {
      throw new ServiceUnavailableException(err.message);
    }
    throw err;
  }
}
