// src/accounting/services/accounting-general-ledger.service.ts

import { Injectable, Logger } from '@nestjs/common';

import { AccountingResolverService } from './accounting-resolver.service';
import { isAccountingGeneralLedgerProvider } from '../interfaces/accounting-provider.interface';
import { AccountingCapabilityNotSupportedError } from '../errors/accounting.errors';
import { AccountingCapability } from '../enums/accounting-capability.enum';
import type {
  AccountingListResult,
  JournalSummary,
  ListJournalsParams,
} from '../types/accounting.types';
import type { ListJournalsQueryDto } from '../dto/list-journals.dto';

@Injectable()
export class AccountingGeneralLedgerService {
  private readonly logger = new Logger(AccountingGeneralLedgerService.name);

  constructor(private readonly resolver: AccountingResolverService) {}

  async listJournals(
    companyId: string,
    credentialId: string,
    query: ListJournalsQueryDto,
    organisationId?: string,
  ): Promise<AccountingListResult<JournalSummary>> {
    this.logger.debug(
      `[listJournals] company=${companyId} cred=${credentialId} org=${organisationId ?? 'default'}`,
    );

    const { adapter, context } = await this.resolver.resolveByCredentialId(
      companyId,
      credentialId,
    );

    if (!isAccountingGeneralLedgerProvider(adapter)) {
      throw new AccountingCapabilityNotSupportedError(
        adapter.providerKey,
        AccountingCapability.Journals,
      );
    }

    const params: ListJournalsParams = {
      cursor: query.cursor,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      sourceType: query.sourceType,
      offset: query.offset,
    };

    const resolvedContext = organisationId
      ? { ...context, organisationId }
      : context;
    return adapter.listJournals(resolvedContext, params);
  }

  async getJournal(
    companyId: string,
    credentialId: string,
    journalId: string,
    organisationId?: string,
  ): Promise<JournalSummary> {
    this.logger.debug(
      `[getJournal] company=${companyId} cred=${credentialId} id=${journalId}`,
    );

    const { adapter, context } = await this.resolver.resolveByCredentialId(
      companyId,
      credentialId,
    );

    if (!isAccountingGeneralLedgerProvider(adapter)) {
      throw new AccountingCapabilityNotSupportedError(
        adapter.providerKey,
        AccountingCapability.Journals,
      );
    }

    const resolvedContext = organisationId
      ? { ...context, organisationId }
      : context;
    return adapter.getJournal(resolvedContext, journalId);
  }
}
