// src/accounting/services/accounting-manual-journals.service.ts

import { Injectable, Logger } from '@nestjs/common';

import { AccountingResolverService } from './accounting-resolver.service';
import { isAccountingManualJournalsProvider } from '../interfaces/accounting-provider.interface';
import { AccountingCapabilityNotSupportedError } from '../errors/accounting.errors';
import { AccountingCapability } from '../enums/accounting-capability.enum';
import type {
  AccountingListResult,
  ManualJournalSummary,
  ManualJournalDetail,
  ListManualJournalsParams,
  CreateManualJournalRequest,
  UpdateManualJournalRequest,
} from '../types/accounting.types';
import type { ListManualJournalsQueryDto } from '../dto/list-manual-journals.dto';
import type { CreateManualJournalDto } from '../dto/create-manual-journal.dto';
import type { UpdateManualJournalDto } from '../dto/update-manual-journal.dto';

@Injectable()
export class AccountingManualJournalsService {
  private readonly logger = new Logger(AccountingManualJournalsService.name);

  constructor(private readonly resolver: AccountingResolverService) {}

  async listManualJournals(
    companyId: string,
    credentialId: string,
    query: ListManualJournalsQueryDto,
    organisationId?: string,
  ): Promise<AccountingListResult<ManualJournalSummary>> {
    this.logger.debug(
      `[listManualJournals] company=${companyId} cred=${credentialId} org=${organisationId ?? 'default'}`,
    );

    const { adapter, context } = await this.resolver.resolveByCredentialId(
      companyId,
      credentialId,
    );

    if (!isAccountingManualJournalsProvider(adapter)) {
      throw new AccountingCapabilityNotSupportedError(
        adapter.providerKey,
        AccountingCapability.ManualJournals,
      );
    }

    const params: ListManualJournalsParams = {
      cursor: query.cursor,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      status: query.status,
    };

    const resolvedContext = organisationId
      ? { ...context, organisationId }
      : context;
    return adapter.listManualJournals(resolvedContext, params);
  }

  async getManualJournal(
    companyId: string,
    credentialId: string,
    manualJournalId: string,
    organisationId?: string,
  ): Promise<ManualJournalDetail> {
    this.logger.debug(
      `[getManualJournal] company=${companyId} cred=${credentialId} id=${manualJournalId}`,
    );

    const { adapter, context } = await this.resolver.resolveByCredentialId(
      companyId,
      credentialId,
    );

    if (!isAccountingManualJournalsProvider(adapter)) {
      throw new AccountingCapabilityNotSupportedError(
        adapter.providerKey,
        AccountingCapability.ManualJournals,
      );
    }

    const resolvedContext = organisationId
      ? { ...context, organisationId }
      : context;
    return adapter.getManualJournal(resolvedContext, manualJournalId);
  }

  async createManualJournal(
    companyId: string,
    credentialId: string,
    dto: CreateManualJournalDto,
  ): Promise<ManualJournalDetail> {
    this.logger.debug(
      `[createManualJournal] company=${companyId} cred=${credentialId} ref=${dto.externalReference ?? 'none'}`,
    );

    const { adapter, context } = await this.resolver.resolveByCredentialId(
      companyId,
      credentialId,
    );

    if (!isAccountingManualJournalsProvider(adapter)) {
      throw new AccountingCapabilityNotSupportedError(
        adapter.providerKey,
        AccountingCapability.ManualJournals,
      );
    }

    const request: CreateManualJournalRequest = {
      date: dto.date,
      narration: dto.narration,
      lines: dto.lines,
      status: dto.status,
      lineAmountType: dto.lineAmountType,
      showOnCashBasisReports: dto.showOnCashBasisReports,
      externalReference: dto.externalReference,
    };

    const resolvedContext = dto.organisationId
      ? { ...context, organisationId: dto.organisationId }
      : context;
    return adapter.createManualJournal(resolvedContext, request);
  }

  async updateManualJournal(
    companyId: string,
    credentialId: string,
    manualJournalId: string,
    dto: UpdateManualJournalDto,
  ): Promise<ManualJournalDetail> {
    this.logger.debug(
      `[updateManualJournal] company=${companyId} cred=${credentialId} id=${manualJournalId}`,
    );

    const { adapter, context } = await this.resolver.resolveByCredentialId(
      companyId,
      credentialId,
    );

    if (!isAccountingManualJournalsProvider(adapter)) {
      throw new AccountingCapabilityNotSupportedError(
        adapter.providerKey,
        AccountingCapability.ManualJournals,
      );
    }

    const request: UpdateManualJournalRequest = {
      date: dto.date,
      narration: dto.narration,
      lines: dto.lines,
      status: dto.status,
      lineAmountType: dto.lineAmountType,
      showOnCashBasisReports: dto.showOnCashBasisReports,
      externalReference: dto.externalReference,
    };

    const resolvedContext = dto.organisationId
      ? { ...context, organisationId: dto.organisationId }
      : context;
    return adapter.updateManualJournal(
      resolvedContext,
      manualJournalId,
      request,
    );
  }
}
