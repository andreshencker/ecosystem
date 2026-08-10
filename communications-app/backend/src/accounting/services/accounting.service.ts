// src/accounting/services/accounting.service.ts

import { Injectable } from '@nestjs/common';

import { AccountingProviderRegistry } from '../registry/accounting-provider.registry';
import type {
  AccountingProviderCapabilities,
  AccountingProviderMetadata,
} from '../types/accounting.types';

@Injectable()
export class AccountingService {
  constructor(private readonly registry: AccountingProviderRegistry) {}

  /**
   * Returns the declared capabilities for a registered accounting provider.
   * Does not require company context — capability data is global to the provider.
   * Throws AccountingProviderNotFoundError if providerKey is not registered.
   */
  getCapabilities(providerKey: string): AccountingProviderCapabilities & {
    providerKey: string;
    displayName: string;
  } {
    const provider = this.registry.resolve(providerKey);
    return {
      providerKey: provider.providerKey,
      displayName: provider.displayName,
      ...provider.getCapabilities(),
    };
  }

  /**
   * Lists all registered accounting providers with their public metadata.
   * Does not require company context.
   */
  listProviders(): { data: AccountingProviderMetadata[]; total: number } {
    const data = this.registry.listAll().map((p) => p.getMetadata());
    return { data, total: data.length };
  }
}
