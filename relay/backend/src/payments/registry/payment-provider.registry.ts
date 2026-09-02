// src/payments/registry/payment-provider.registry.ts

import type { IPaymentProvider } from '../interfaces/payment-provider.interface';
import {
  DuplicateProviderRegistrationError,
  PaymentProviderNotFoundError,
} from '../errors/payment.errors';

/**
 * PaymentProviderRegistry
 *
 * Single source of truth for registered payment provider adapters.
 * Populated once at module startup; immutable at runtime.
 *
 * Resolution uses a Map keyed by providerKey — no switch statements, no
 * hard-coded provider names outside of registration.
 *
 * Adding a new provider requires only:
 *   1. creating the provider class in its own folder;
 *   2. contributing it to the factory array in PaymentsModule.
 *
 * Deleting a provider removes its entry from the registry automatically.
 */
export class PaymentProviderRegistry {
  private readonly registry: ReadonlyMap<string, IPaymentProvider>;

  constructor(providers: IPaymentProvider[]) {
    const map = new Map<string, IPaymentProvider>();

    for (const provider of providers) {
      const key = provider.providerKey;
      if (map.has(key)) {
        throw new DuplicateProviderRegistrationError(key);
      }
      map.set(key, provider);
    }

    this.registry = map;
  }

  /**
   * Resolves a registered provider by its providerKey.
   * Throws PaymentProviderNotFoundError if the key is not registered.
   */
  resolve(providerKey: string): IPaymentProvider {
    const provider = this.registry.get(providerKey);
    if (!provider) {
      throw new PaymentProviderNotFoundError(providerKey);
    }
    return provider;
  }

  /** Returns all registered providers. Order is registration order. */
  listAll(): IPaymentProvider[] {
    return Array.from(this.registry.values());
  }

  /** Returns true if the providerKey is registered. */
  has(providerKey: string): boolean {
    return this.registry.has(providerKey);
  }

  /** Number of registered providers. */
  get size(): number {
    return this.registry.size;
  }
}
