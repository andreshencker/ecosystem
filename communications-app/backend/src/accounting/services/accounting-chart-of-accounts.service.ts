// src/accounting/services/accounting-chart-of-accounts.service.ts

import { Injectable, Logger } from '@nestjs/common';

import { AccountingResolverService } from './accounting-resolver.service';
import {
  isAccountingChartOfAccountsProvider,
  type IAccountingChartOfAccountsProvider,
} from '../interfaces/accounting-provider.interface';
import { AccountingCapabilityNotSupportedError } from '../errors/accounting.errors';
import { AccountingCapability } from '../enums/accounting-capability.enum';
import type {
  AccountingListResult,
  AccountSummary,
  AccountDetail,
  CreateAccountParams,
  UpdateAccountParams,
  ArchiveAccountResult,
  DeleteAccountResult,
  ListAccountsParams,
  AccountingProviderContext,
} from '../types/accounting.types';

@Injectable()
export class AccountingChartOfAccountsService {
  private readonly logger = new Logger(AccountingChartOfAccountsService.name);

  constructor(private readonly resolver: AccountingResolverService) {}

  private buildContext(
    base: AccountingProviderContext,
    organisationId?: string,
  ): AccountingProviderContext {
    if (!organisationId) return base;
    return { ...base, organisationId };
  }

  private async resolveProvider(
    companyId: string,
    credentialId: string,
  ): Promise<{
    adapter: IAccountingChartOfAccountsProvider;
    context: AccountingProviderContext;
  }> {
    const resolved = await this.resolver.resolveByCredentialId(
      companyId,
      credentialId,
    );
    if (!isAccountingChartOfAccountsProvider(resolved.adapter)) {
      throw new AccountingCapabilityNotSupportedError(
        resolved.adapter.providerKey,
        AccountingCapability.ChartOfAccounts,
      );
    }
    return { adapter: resolved.adapter, context: resolved.context };
  }

  async listAccounts(
    companyId: string,
    credentialId: string,
    params: ListAccountsParams,
    organisationId?: string,
  ): Promise<AccountingListResult<AccountSummary>> {
    this.logger.debug(
      `[listAccounts] company=${companyId} cred=${credentialId} orgId=${organisationId ?? 'default'}`,
    );
    const { adapter, context } = await this.resolveProvider(
      companyId,
      credentialId,
    );
    return adapter.listAccounts(
      this.buildContext(context, organisationId),
      params,
    );
  }

  async getAccount(
    companyId: string,
    credentialId: string,
    accountId: string,
    organisationId?: string,
  ): Promise<AccountDetail> {
    this.logger.debug(
      `[getAccount] company=${companyId} cred=${credentialId} accountId=${accountId}`,
    );
    const { adapter, context } = await this.resolveProvider(
      companyId,
      credentialId,
    );
    return adapter.getAccount(
      this.buildContext(context, organisationId),
      accountId,
    );
  }

  async createAccount(
    companyId: string,
    credentialId: string,
    params: CreateAccountParams,
    organisationId?: string,
  ): Promise<AccountDetail> {
    this.logger.log(
      `[createAccount] company=${companyId} cred=${credentialId} type=${params.type}`,
    );
    const { adapter, context } = await this.resolveProvider(
      companyId,
      credentialId,
    );
    return adapter.createAccount(
      this.buildContext(context, organisationId),
      params,
    );
  }

  async updateAccount(
    companyId: string,
    credentialId: string,
    accountId: string,
    params: UpdateAccountParams,
    organisationId?: string,
  ): Promise<AccountDetail> {
    this.logger.log(
      `[updateAccount] company=${companyId} cred=${credentialId} accountId=${accountId}`,
    );
    const { adapter, context } = await this.resolveProvider(
      companyId,
      credentialId,
    );
    return adapter.updateAccount(
      this.buildContext(context, organisationId),
      accountId,
      params,
    );
  }

  async archiveAccount(
    companyId: string,
    credentialId: string,
    accountId: string,
    organisationId?: string,
  ): Promise<ArchiveAccountResult> {
    this.logger.log(
      `[archiveAccount] company=${companyId} cred=${credentialId} accountId=${accountId}`,
    );
    const { adapter, context } = await this.resolveProvider(
      companyId,
      credentialId,
    );
    return adapter.archiveAccount(
      this.buildContext(context, organisationId),
      accountId,
    );
  }

  async deleteAccount(
    companyId: string,
    credentialId: string,
    accountId: string,
    organisationId?: string,
  ): Promise<DeleteAccountResult> {
    this.logger.log(
      `[deleteAccount] company=${companyId} cred=${credentialId} accountId=${accountId}`,
    );
    const { adapter, context } = await this.resolveProvider(
      companyId,
      credentialId,
    );
    return adapter.deleteAccount(
      this.buildContext(context, organisationId),
      accountId,
    );
  }
}
