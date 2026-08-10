// src/accounting/services/accounting-bank-transactions.service.ts

import { Injectable, Logger } from '@nestjs/common';

import { AccountingResolverService } from './accounting-resolver.service';
import { isAccountingBankingProvider } from '../interfaces/accounting-provider.interface';
import { AccountingCapabilityNotSupportedError } from '../errors/accounting.errors';
import { AccountingCapability } from '../enums/accounting-capability.enum';
import type {
  AccountingListResult,
  BankTransactionSummary,
  ListBankTransactionsParams,
} from '../types/accounting.types';
import type { ListBankTransactionsQueryDto } from '../dto/list-bank-transactions.dto';

@Injectable()
export class AccountingBankTransactionsService {
  private readonly logger = new Logger(AccountingBankTransactionsService.name);

  constructor(private readonly resolver: AccountingResolverService) {}

  /**
   * Lists bank transactions for a specific bank account.
   *
   * @param companyId      From the authenticated JWT — never from the request.
   * @param credentialId   ProviderCredentials._id.
   * @param bankAccountId  Provider bank account ID (e.g. Xero AccountID).
   * @param query          Validated query params from the controller.
   * @param organisationId Optional Communications organisation ID.
   */
  async listBankTransactions(
    companyId: string,
    credentialId: string,
    bankAccountId: string,
    query: ListBankTransactionsQueryDto,
    organisationId?: string,
  ): Promise<AccountingListResult<BankTransactionSummary>> {
    this.logger.debug(
      `[listBankTransactions] company=${companyId} cred=${credentialId} ` +
        `bankAccount=${bankAccountId} orgId=${organisationId ?? 'default'}`,
    );

    const { adapter, context } = await this.resolver.resolveByCredentialId(
      companyId,
      credentialId,
    );

    if (!isAccountingBankingProvider(adapter)) {
      throw new AccountingCapabilityNotSupportedError(
        adapter.providerKey,
        AccountingCapability.BankTransactions,
      );
    }

    const params: ListBankTransactionsParams = {
      cursor: query.cursor,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      status: query.status,
      search: query.search,
    };

    const resolvedContext = organisationId
      ? { ...context, organisationId }
      : context;

    return adapter.listBankTransactions(resolvedContext, bankAccountId, params);
  }
}
