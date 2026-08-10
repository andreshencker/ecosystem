// src/accounting/controllers/accounting-manual-journals.controller.ts
//
// Manual Journals — external application integration capability.
//
// External applications supply fully-formed manual journal requests.
// Communications validates structure, resolves the provider/connection,
// and forwards the request to the accounting provider adapter.
//
// Communications must NOT:
//   - choose account codes;
//   - infer debit/credit direction;
//   - rebalance journal lines;
//   - choose tax types;
//   - apply any business accounting logic.
//
// Xero endpoint: /api.xro/2.0/ManualJournals
// Required scope: accounting.manualjournals (write); accounting.manualjournals.read (list/get)

import {
  Body,
  Controller,
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
  AccountingProviderNotConfiguredError,
  AccountingProviderNotFoundError,
  AccountingProviderCredentialsUnavailableError,
  AccountingProviderUnavailableError,
  AccountingResourceNotFoundError,
  AccountingReauthorisationRequiredError,
  AccountingValidationError,
} from '../errors/accounting.errors';

import type {
  ManualJournalSummary,
  ManualJournalDetail,
} from '../types/accounting.types';
import type { AccountingListResult } from '../types/accounting.types';
import { ListManualJournalsQueryDto } from '../dto/list-manual-journals.dto';
import { CreateManualJournalDto } from '../dto/create-manual-journal.dto';
import { UpdateManualJournalDto } from '../dto/update-manual-journal.dto';
import { AccountingManualJournalsService } from '../services/accounting-manual-journals.service';

@ApiTags('Accounting — Manual Journals')
@ApiBearerAuth()
@Controller('accounting/manual-journals/:credentialId')
export class AccountingManualJournalsController {
  constructor(
    private readonly manualJournalsService: AccountingManualJournalsService,
  ) {}

  // ─── GET /accounting/manual-journals/:credentialId ───────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List manual journals',
    description:
      'Lists manual journals from the connected accounting provider. ' +
      'For Xero this requires the accounting.manualjournals.read OAuth scope.',
  })
  @ApiParam({ name: 'credentialId', description: 'ProviderCredentials._id' })
  @ApiQuery({ name: 'organisationId', required: false })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'draft | posted | deleted | voided | all',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Manual journal list' })
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
  async listManualJournals(
    @CurrentUser() ctx: AuthContext,
    @Param('credentialId') credentialId: string,
    @Query() query: ListManualJournalsQueryDto,
    @Query('organisationId') organisationId?: string,
  ): Promise<AccountingListResult<ManualJournalSummary>> {
    const companyId = this.resolveCompanyId(ctx);
    return this.manualJournalsService
      .listManualJournals(companyId, credentialId, query, organisationId)
      .catch((err: unknown): never => this.mapDomainError(err));
  }

  // ─── GET /accounting/manual-journals/:credentialId/:manualJournalId ──────────

  @Get(':manualJournalId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single manual journal by provider ID' })
  @ApiParam({ name: 'credentialId', description: 'ProviderCredentials._id' })
  @ApiParam({
    name: 'manualJournalId',
    description: 'Provider manual journal ID',
  })
  @ApiQuery({ name: 'organisationId', required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'Manual journal detail' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Manual journal not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No company context',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Provider unavailable',
  })
  async getManualJournal(
    @CurrentUser() ctx: AuthContext,
    @Param('credentialId') credentialId: string,
    @Param('manualJournalId') manualJournalId: string,
    @Query('organisationId') organisationId?: string,
  ): Promise<ManualJournalDetail> {
    const companyId = this.resolveCompanyId(ctx);
    return this.manualJournalsService
      .getManualJournal(
        companyId,
        credentialId,
        manualJournalId,
        organisationId,
      )
      .catch((err: unknown): never => this.mapDomainError(err));
  }

  // ─── POST /accounting/manual-journals/:credentialId ──────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a manual journal',
    description:
      'Creates a manual journal in the connected accounting provider. ' +
      'The external application must supply all account codes, amounts, ' +
      'debit/credit intent, taxes, and business logic. ' +
      'Communications validates structure only and does not modify journal lines. ' +
      'For Xero this requires the accounting.manualjournals OAuth scope.',
  })
  @ApiParam({ name: 'credentialId', description: 'ProviderCredentials._id' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Manual journal created',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No company context',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Validation error or capability not supported',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Provider unavailable or OAuth scope missing',
  })
  async createManualJournal(
    @CurrentUser() ctx: AuthContext,
    @Param('credentialId') credentialId: string,
    @Body() dto: CreateManualJournalDto,
  ): Promise<ManualJournalDetail> {
    const companyId = this.resolveCompanyId(ctx);
    return this.manualJournalsService
      .createManualJournal(companyId, credentialId, dto)
      .catch((err: unknown): never => this.mapDomainError(err));
  }

  // ─── PATCH /accounting/manual-journals/:credentialId/:manualJournalId ────────

  @Patch(':manualJournalId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a manual journal',
    description:
      'Updates an existing DRAFT manual journal. ' +
      'POSTED journals are immutable — the provider will reject the request. ' +
      'For Xero this requires the accounting.manualjournals OAuth scope.',
  })
  @ApiParam({ name: 'credentialId', description: 'ProviderCredentials._id' })
  @ApiParam({
    name: 'manualJournalId',
    description: 'Provider manual journal ID',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Manual journal updated' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Manual journal not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No company context',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Validation error or capability not supported',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Provider unavailable or OAuth scope missing',
  })
  async updateManualJournal(
    @CurrentUser() ctx: AuthContext,
    @Param('credentialId') credentialId: string,
    @Param('manualJournalId') manualJournalId: string,
    @Body() dto: UpdateManualJournalDto,
  ): Promise<ManualJournalDetail> {
    const companyId = this.resolveCompanyId(ctx);
    return this.manualJournalsService
      .updateManualJournal(companyId, credentialId, manualJournalId, dto)
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
      err instanceof AccountingCapabilityNotSupportedError ||
      err instanceof AccountingValidationError
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
