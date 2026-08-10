// src/accounting/registry/accounting-provider.registry.ts

import type { IAccountingProvider } from '../interfaces/accounting-provider.interface';
import {
  DuplicateAccountingProviderRegistrationError,
  AccountingProviderNotFoundError,
} from '../errors/accounting.errors';

/**
 * AccountingProviderRegistry
 *
 * Single source of truth for registered accounting provider adapters.
 * Populated once at module startup; immutable at runtime.
 *
 * Resolution uses a Map keyed by providerKey — no switch statements, no
 * hard-coded provider names outside of registration.
 *
 * Adding a new provider requires only:
 *   1. creating the provider class in its own folder;
 *   2. contributing it to the factory array in AccountingModule.
 */
export class AccountingProviderRegistry {
  private readonly registry: ReadonlyMap<string, IAccountingProvider>;

  constructor(providers: IAccountingProvider[]) {
    const map = new Map<string, IAccountingProvider>();

    for (const provider of providers) {
      const key = provider.providerKey;
      if (map.has(key)) {
        throw new DuplicateAccountingProviderRegistrationError(key);
      }
      map.set(key, provider);
    }

    this.registry = map;
  }

  /**
   * Resolves a registered provider by its providerKey.
   * Throws AccountingProviderNotFoundError if the key is not registered.
   */
  resolve(providerKey: string): IAccountingProvider {
    const provider = this.registry.get(providerKey);
    if (!provider) {
      throw new AccountingProviderNotFoundError(providerKey);
    }
    return provider;
  }

  /** Returns all registered providers. Order is registration order. */
  listAll(): IAccountingProvider[] {
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
