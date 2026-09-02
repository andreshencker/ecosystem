// src/accounting/providers/accounting-provider.tokens.ts

/**
 * Centralised NestJS injection tokens for the Accounting provider layer.
 *
 * Using string tokens allows the registry and provider adapters to be
 * substituted with test doubles without changing import paths.
 */

/** Injection token for AccountingProviderRegistry. */
export const ACCOUNTING_PROVIDER_REGISTRY = 'ACCOUNTING_PROVIDER_REGISTRY';

/**
 * Well-known canonical provider keys for use in switch-free provider resolution.
 * These must match the providerKey values declared by each provider adapter.
 */
export const AccountingProviderKey = {
  Xero: 'xero',
  QuickBooks: 'quickbooks',
  MYOB: 'myob',
  Sage: 'sage',
} as const;

export type AccountingProviderKey =
  (typeof AccountingProviderKey)[keyof typeof AccountingProviderKey];
