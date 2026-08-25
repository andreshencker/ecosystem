// src/payments/services/payments-resolver.service.ts

import { HttpException, Injectable, Logger } from '@nestjs/common';

import { ChannelsRuntimeResolverService } from '../../communication/channels/runtime/channels-runtime-resolver.service';
import { PaymentProviderRegistry } from '../registry/payment-provider.registry';
import type { IPaymentProvider } from '../interfaces/payment-provider.interface';
import type { PaymentProviderContext } from '../types/payment.types';
import { PaymentCredentialChannelMismatchError } from '../errors/payment.errors';

/**
 * PaymentsResolverService
 *
 * Thin domain adapter over ChannelsRuntimeResolverService for the Payment channel.
 *
 * Resolution path (via ChannelsRuntimeResolverService.resolveByChannelAndProvider):
 *   Company → Channel('payment') → Provider → CCP → Credentials → Adapter
 *
 * This service no longer queries Provider, CompanyChannelProvider, or
 * ProviderCredentials directly. All credential resolution and company isolation
 * is delegated to ChannelsRuntimeResolverService, which enforces the canonical
 * Company → Channel → Provider resolution order for every request.
 *
 * The PaymentProviderRegistry is the only Payments-specific concern: it maps
 * a providerKey to the concrete adapter class (StripePaymentProvider, etc.).
 */
@Injectable()
export class PaymentsResolverService {
  private readonly logger = new Logger(PaymentsResolverService.name);

  constructor(
    private readonly runtimeResolver: ChannelsRuntimeResolverService,
    private readonly registry: PaymentProviderRegistry,
  ) {}

  /**
   * Resolves the active payment provider adapter and credential context for a
   * given company.
   *
   * Resolution order:
   *   1. Verify the providerKey is registered in the Payment adapter registry.
   *      Throws PaymentProviderNotFoundError immediately for unknown keys — no DB
   *      queries are made for unregistered providers.
   *   2. Delegate to ChannelsRuntimeResolverService.resolveByChannelAndProvider:
   *        Company → Channel('payment') → Provider → CCP → Credentials
   *      The channel filter guarantees that Stripe's Payment CCP is never confused
   *      with a hypothetical Stripe Billing CCP if Stripe were ever multi-channel.
   *   3. Assert the resolved channelKey is 'payment' (belt-and-suspenders).
   *   4. Return the adapter and the in-memory credential context.
   *
   * Throws HttpException (from the runtime resolver) on any configuration gap.
   * The controller's mapDomainError re-throws HttpException as-is.
   */
  async resolveForCompany(
    companyId: string,
    providerKey: string,
  ): Promise<{ adapter: IPaymentProvider; context: PaymentProviderContext }> {
    this.logger.debug(
      `[resolve] companyId=${companyId} providerKey=${providerKey}`,
    );

    // Fast-fail: adapter must exist before any DB queries.
    // Throws PaymentProviderNotFoundError (→ 404 via mapDomainError) if unknown.
    const adapter = this.registry.resolve(providerKey);

    // Canonical resolution: Company → Channel('payment') → Provider → CCP → Credential.
    // Throws HttpException(422) on any gap:
    //   - channel inactive
    //   - provider not in payment channel
    //   - no CCP for this company
    //   - no active credentials
    const resolved = await this.runtimeResolver.resolveByChannelAndProvider({
      companyId,
      channelKey: 'payment',
      providerKey,
    });

    // Belt-and-suspenders: the runtime resolver already enforced channelKey='payment'
    // in the CCP query, but we re-check the returned value for defence-in-depth.
    if (resolved.channelKey !== 'payment') {
      throw new PaymentCredentialChannelMismatchError(
        resolved.providerCredentialsId,
        'payment',
      );
    }

    const context: PaymentProviderContext = {
      providerKey: resolved.providerKey,
      connectionType: resolved.connectionType,
      credentialsId: resolved.providerCredentialsId,
      isActive: resolved.isActive,
      credentials: resolved.credentials,
    };

    this.logger.debug(
      `[resolve] resolved: channel=payment providerKey=${context.providerKey} ` +
        `ccp=${resolved.companyChannelProviderId} credentialsId=${context.credentialsId}`,
    );

    return { adapter, context };
  }

  /**
   * Resolves a payment provider by an explicit credential ID.
   *
   * Used when the caller holds a specific credential ID (e.g. the test-connection
   * endpoint, the payment list endpoint).
   *
   * Company isolation is enforced by ChannelsRuntimeResolverService: it throws
   * 404 if the credential belongs to a different company.
   *
   * Validates that the resolved channelKey is 'payment' to prevent a caller from
   * using a Calendar or Accounting credential against a Payment endpoint.
   */
  async resolveByCredentialId(
    companyId: string,
    credentialId: string,
  ): Promise<{ adapter: IPaymentProvider; context: PaymentProviderContext }> {
    this.logger.debug(
      `[resolve-by-cred] companyId=${companyId} credentialId=${credentialId}`,
    );

    const resolved = await this.runtimeResolver.resolveByProviderCredentialsId({
      companyId,
      providerCredentialsId: credentialId,
    });

    if (resolved.channelKey !== 'payment') {
      throw new PaymentCredentialChannelMismatchError(credentialId, 'payment');
    }

    const adapter = this.registry.resolve(resolved.providerKey);

    const context: PaymentProviderContext = {
      providerKey: resolved.providerKey,
      connectionType: resolved.connectionType,
      credentialsId: resolved.providerCredentialsId,
      isActive: resolved.isActive,
      credentials: resolved.credentials,
    };

    this.logger.debug(
      `[resolve-by-cred] resolved: channel=payment providerKey=${context.providerKey} ` +
        `credentialsId=${context.credentialsId}`,
    );

    return { adapter, context };
  }
}
