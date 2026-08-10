// src/accounting/services/accounting-banking.service.ts

import { Injectable, Logger } from '@nestjs/common';

import { AccountingResolverService } from './accounting-resolver.service';
import { isAccountingBankingProvider } from '../interfaces/accounting-provider.interface';
import { AccountingCapabilityNotSupportedError } from '../errors/accounting.errors';
import { AccountingCapability } from '../enums/accounting-capability.enum';
import type {
  AccountingListResult,
  AccountingListParams,
  AccountingProviderContext,
  BankAccountSummary,
} from '../types/accounting.types';
import type {
  BankAccountDetail,
  BankAccountBalance,
} from '../contracts/banking/accounting-bank-account.contract';
import type { ListBankAccountsQueryDto } from '../dto/list-bank-accounts.dto';

@Injectable()
export class AccountingBankingService {
  private readonly logger = new Logger(AccountingBankingService.name);

  constructor(private readonly resolver: AccountingResolverService) {}

  // ─── Context builder ──────────────────────────────────────────────────────────

  /**
   * Builds the provider context, optionally including an organisationId.
   *
   * When organisationId is present the Xero provider uses it to resolve the
   * correct Xero tenant rather than the default stored in the credential.
   * External callers only supply a Communications organisation ID — the Xero
   * tenant UUID is resolved internally and never returned to callers.
   */
  private buildContext(
    base: AccountingProviderContext,
    organisationId?: string,
  ): AccountingProviderContext {
    if (!organisationId) return base;
    return { ...base, organisationId };
  }

  // ─── Operations ───────────────────────────────────────────────────────────────

  /**
   * Lists bank accounts for the given Xero connection and optional organisation.
   *
   * @param companyId      From the authenticated JWT — never from the request body.
   * @param credentialId   ProviderCredentials._id (identifies the Xero connection).
   * @param query          Validated query params from the controller.
   * @param organisationId Optional Communications organisation ID. When supplied,
   *                       the provider resolves it to the correct Xero tenant.
   */
  async listBankAccounts(
    companyId: string,
    credentialId: string,
    query: ListBankAccountsQueryDto,
    organisationId?: string,
  ): Promise<AccountingListResult<BankAccountSummary>> {
    this.logger.debug(
      `[listBankAccounts] companyId=${companyId} credentialId=${credentialId} orgId=${organisationId ?? 'default'}`,
    );

    const { adapter, context } = await this.resolver.resolveByCredentialId(
      companyId,
      credentialId,
    );

    if (!isAccountingBankingProvider(adapter)) {
      throw new AccountingCapabilityNotSupportedError(
        adapter.providerKey,
        AccountingCapability.Banking,
      );
    }

    const params: AccountingListParams & {
      includeArchived?: boolean;
      accountType?: string;
      withBalances?: boolean;
    } = {
      limit: query.limit,
      cursor: query.cursor,
      search: query.search,
      includeArchived: query.includeArchived,
      accountType: query.accountType,
      withBalances: query.withBalances,
    };

    return adapter.listBankAccounts(
      this.buildContext(context, organisationId),
      params,
    );
  }

  /**
   * Retrieves a single bank account detail from the provider.
   *
   * @param companyId      From the authenticated JWT.
   * @param credentialId   ProviderCredentials._id.
   * @param accountId      Provider bank account identifier (e.g. Xero AccountID).
   * @param organisationId Optional Communications organisation ID.
   */
  async getBankAccount(
    companyId: string,
    credentialId: string,
    accountId: string,
    organisationId?: string,
  ): Promise<BankAccountDetail> {
    this.logger.debug(
      `[getBankAccount] companyId=${companyId} credentialId=${credentialId} accountId=${accountId} orgId=${organisationId ?? 'default'}`,
    );

    const { adapter, context } = await this.resolver.resolveByCredentialId(
      companyId,
      credentialId,
    );

    if (!isAccountingBankingProvider(adapter)) {
      throw new AccountingCapabilityNotSupportedError(
        adapter.providerKey,
        AccountingCapability.Banking,
      );
    }

    return adapter.getBankAccount(
      this.buildContext(context, organisationId),
      accountId,
    );
  }

  /**
   * Retrieves the current balance for a specific bank account.
   *
   * @param companyId      From the authenticated JWT.
   * @param credentialId   ProviderCredentials._id.
   * @param accountId      Provider bank account identifier.
   * @param organisationId Optional Communications organisation ID.
   */
  async getBankAccountBalance(
    companyId: string,
    credentialId: string,
    accountId: string,
    organisationId?: string,
  ): Promise<BankAccountBalance> {
    this.logger.debug(
      `[getBankAccountBalance] companyId=${companyId} credentialId=${credentialId} accountId=${accountId} orgId=${organisationId ?? 'default'}`,
    );

    const { adapter, context } = await this.resolver.resolveByCredentialId(
      companyId,
      credentialId,
    );

    if (!isAccountingBankingProvider(adapter)) {
      throw new AccountingCapabilityNotSupportedError(
        adapter.providerKey,
        AccountingCapability.Banking,
      );
    }

    return adapter.getBankAccountBalance(
      this.buildContext(context, organisationId),
      accountId,
    );
  }
}
