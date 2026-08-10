// src/accounting/services/accounting-resolver.service.ts

import { Injectable, Logger } from '@nestjs/common';

import { ChannelsRuntimeResolverService } from '../../communication/channels/runtime/channels-runtime-resolver.service';
import { AccountingProviderRegistry } from '../registry/accounting-provider.registry';
import type { IAccountingProvider } from '../interfaces/accounting-provider.interface';
import type { AccountingProviderContext } from '../types/accounting.types';
import { AccountingCredentialChannelMismatchError } from '../errors/accounting.errors';

/**
 * AccountingResolverService
 *
 * Thin domain adapter over ChannelsRuntimeResolverService for the Accounting channel.
 *
 * Resolution path (via ChannelsRuntimeResolverService.resolveByChannelAndProvider):
 *   Company → Channel('accounting') → Provider → CCP → Credentials → Adapter
 *
 * All credential resolution and company isolation is delegated to
 * ChannelsRuntimeResolverService. The AccountingProviderRegistry is the only
 * Accounting-specific concern: it maps a providerKey to the concrete adapter
 * class (XeroAccountingProvider, etc.).
 */
@Injectable()
export class AccountingResolverService {
  private readonly logger = new Logger(AccountingResolverService.name);

  constructor(
    private readonly runtimeResolver: ChannelsRuntimeResolverService,
    private readonly registry: AccountingProviderRegistry,
  ) {}

  /**
   * Resolves the active accounting provider adapter and credential context for a
   * given company.
   *
   * Resolution order:
   *   1. Verify the providerKey is registered in the Accounting adapter registry.
   *      Throws AccountingProviderNotFoundError immediately for unknown keys — no
   *      DB queries are made for unregistered providers.
   *   2. Delegate to ChannelsRuntimeResolverService.resolveByChannelAndProvider:
   *        Company → Channel('accounting') → Provider → CCP → Credentials
   *      The channel filter guarantees that Xero's Accounting CCP is never
   *      confused with a hypothetical Xero Billing CCP.
   *   3. Assert the resolved channelKey is 'accounting' (belt-and-suspenders).
   *   4. Return the adapter and the in-memory credential context.
   *
   * Throws HttpException (from the runtime resolver) on any configuration gap.
   */
  async resolveForCompany(
    companyId: string,
    providerKey: string,
  ): Promise<{
    adapter: IAccountingProvider;
    context: AccountingProviderContext;
  }> {
    this.logger.debug(
      `[resolve] companyId=${companyId} providerKey=${providerKey}`,
    );

    // Fast-fail: adapter must exist before any DB queries.
    const adapter = this.registry.resolve(providerKey);

    const resolved = await this.runtimeResolver.resolveByChannelAndProvider({
      companyId,
      channelKey: 'accounting',
      providerKey,
    });

    if (resolved.channelKey !== 'accounting') {
      throw new AccountingCredentialChannelMismatchError(
        resolved.providerCredentialsId,
        'accounting',
      );
    }

    const context: AccountingProviderContext = {
      providerKey: resolved.providerKey,
      connectionType: resolved.connectionType,
      credentialsId: resolved.providerCredentialsId,
      isActive: resolved.isActive,
      credentials: resolved.credentials,
    };

    this.logger.debug(
      `[resolve] resolved: channel=accounting providerKey=${context.providerKey} ` +
        `credentialsId=${context.credentialsId}`,
    );

    return { adapter, context };
  }

  /**
   * Resolves an accounting provider by an explicit credential ID.
   *
   * Used when the caller holds a specific credential ID.
   * Company isolation is enforced by ChannelsRuntimeResolverService.
   * Validates that the resolved channelKey is 'accounting' to prevent
   * cross-channel credential misuse.
   */
  async resolveByCredentialId(
    companyId: string,
    credentialId: string,
  ): Promise<{
    adapter: IAccountingProvider;
    context: AccountingProviderContext;
  }> {
    this.logger.debug(
      `[resolve-by-cred] companyId=${companyId} credentialId=${credentialId}`,
    );

    const resolved = await this.runtimeResolver.resolveByProviderCredentialsId({
      companyId,
      providerCredentialsId: credentialId,
    });

    if (resolved.channelKey !== 'accounting') {
      throw new AccountingCredentialChannelMismatchError(
        credentialId,
        'accounting',
      );
    }

    const adapter = this.registry.resolve(resolved.providerKey);

    const context: AccountingProviderContext = {
      providerKey: resolved.providerKey,
      connectionType: resolved.connectionType,
      credentialsId: resolved.providerCredentialsId,
      isActive: resolved.isActive,
      credentials: resolved.credentials,
    };

    this.logger.debug(
      `[resolve-by-cred] resolved: channel=accounting providerKey=${context.providerKey} ` +
        `credentialsId=${context.credentialsId}`,
    );

    return { adapter, context };
  }
}
