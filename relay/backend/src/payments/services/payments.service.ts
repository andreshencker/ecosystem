// src/payments/services/payments.service.ts

import { Injectable } from '@nestjs/common';

import { PaymentProviderRegistry } from '../registry/payment-provider.registry';
import type { IPaymentProvider } from '../interfaces/payment-provider.interface';
import type {
  PaymentProviderMetadata,
  PaymentProviderCapabilities,
  PaymentProviderRuntimeContext,
} from '../types/payment.types';
import { PaymentCapability, CapabilityStatus } from '../enums/payment.enums';
import { PaymentCapabilityNotSupportedError } from '../errors/payment.errors';
import { PaymentsResolverService } from './payments-resolver.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly registry: PaymentProviderRegistry,
    private readonly resolver: PaymentsResolverService,
  ) {}

  // ─── Catalogue (no company context required) ──────────────────────────────

  /**
   * Lists all registered payment providers with their public metadata.
   * Does not require company context — catalogue data is global.
   * Does not expose credential values.
   */
  listProviders(): { data: PaymentProviderMetadata[]; total: number } {
    const data = this.registry.listAll().map((p) => p.getMetadata());
    return { data, total: data.length };
  }

  /**
   * Returns the declared capabilities of a registered provider.
   * Throws PaymentProviderNotFoundError if providerKey is not registered.
   * Does not require company context.
   */
  getCapabilities(providerKey: string): PaymentProviderCapabilities & {
    providerKey: string;
    displayName: string;
  } {
    const provider = this.registry.resolve(providerKey); // throws if unknown
    return {
      providerKey: provider.providerKey,
      displayName: provider.displayName,
      ...provider.getCapabilities(),
    };
  }

  // ─── Provider resolution (company context required) ───────────────────────

  /**
   * Resolves the full runtime context for a company's payment account.
   *
   * Orchestrates: credential lookup → company isolation → decryption → adapter.
   * The returned context holds decrypted credentials in memory only.
   *
   * @param companyId - From the authenticated JWT; never from request body.
   * @param accountId - ProviderCredentials._id (the Payments "accountId").
   */
  async resolveRuntime(
    companyId: string,
    accountId: string,
  ): Promise<PaymentProviderRuntimeContext> {
    const { adapter, context } = await this.resolver.resolveByCredentialId(
      companyId,
      accountId,
    );

    return {
      accountId: context.credentialsId,
      companyId,
      providerKey: context.providerKey,
      environment: null, // determined by provider adapter from credentials
      provider: adapter,
      credentials: context.credentials,
    };
  }

  /**
   * Returns the registered provider adapter for a given providerKey.
   * Throws PaymentProviderNotFoundError if the key is not registered.
   *
   * Used by higher-level service methods to obtain an adapter for
   * non-credential-scoped operations (e.g. provider discovery).
   */
  resolveProvider(providerKey: string): IPaymentProvider {
    return this.registry.resolve(providerKey);
  }

  /**
   * Asserts that a provider has declared the given capability as available.
   *
   * Throws PaymentCapabilityNotSupportedError if:
   *   - the capability is absent from the provider's declaration; or
   *   - the capability status is not 'available' (planned or unsupported).
   *
   * Usage: call this before invoking any optional provider operation to
   * surface a canonical error instead of a runtime exception.
   *
   * @example
   *   service.assertCapability(provider, PaymentCapability.Refunds);
   *   const refund = await provider.createRefund(context, params);
   */
  assertCapability(
    provider: IPaymentProvider,
    capability: PaymentCapability,
  ): void {
    const capabilities = provider.getCapabilities().capabilities;
    const status = capabilities[capability];

    if (!status || status !== CapabilityStatus.Available) {
      throw new PaymentCapabilityNotSupportedError(
        provider.providerKey,
        capability,
      );
    }
  }
}
