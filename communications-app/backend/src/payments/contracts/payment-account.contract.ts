// src/payments/contracts/payment-account.contract.ts
//
// Canonical representation of a connected payment provider account.
//
// This is a live view — not a persisted entity.
// The `id` field is the existing ProviderCredentials._id.
// No new database collection is created.

import type { PaymentAccountStatus } from '../enums/payment-account-status.enum';

/**
 * A single capability reported by the provider for this specific account.
 *
 * Note: `status` here reflects live account-level capability state (as reported
 * by the provider for this merchant account), not the feature implementation
 * status of the Graphify adapter (which is tracked by CapabilityStatus).
 */
export interface PaymentAccountCapability {
  /** Canonical capability name (e.g. 'payments', 'payouts', 'transfers'). */
  name: string;

  /**
   * Account-level capability status as reported by the provider.
   *   active:      Fully operational.
   *   inactive:    Not enabled for this account.
   *   pending:     Awaiting provider review or verification.
   *   restricted:  Enabled but with limitations (e.g. volume caps).
   *   unsupported: Provider does not offer this capability at all.
   */
  status: 'active' | 'inactive' | 'pending' | 'restricted' | 'unsupported';

  /** Whether the operator can toggle this capability through the Graphify API. */
  configurable: boolean;

  /** Human-readable explanation when status is not 'active'. */
  reason?: string;
}

/**
 * Canonical payment account.
 *
 * Represents the live state of a configured payment provider connection.
 * Always fetched from the provider — never cached by Graphify.
 *
 * Provider mapping:
 *   Stripe  → GET /v1/account
 *   PayPal  → GET /v1/identity/oauth2/userinfo
 *   Square  → GET /v2/locations/:id
 */
export interface PaymentAccount {
  /**
   * Graphify account identifier.
   * Equal to ProviderCredentials._id — no separate account entity is created.
   */
  id: string;

  /** Stable canonical provider key (e.g. 'stripe', 'paypal'). */
  providerKey: string;

  /** Execution environment ('test' or 'live'). Null when indeterminate. */
  environment: 'test' | 'live' | null;

  /** Business or account display name as returned by the provider. Null if unavailable. */
  displayName: string | null;

  /** ISO 3166-1 alpha-2 country code of the provider account. Null if unavailable. */
  country: string | null;

  /** ISO 4217 lowercase default currency of the account. Null if unavailable. */
  defaultCurrency: string | null;

  /** Overall account status. */
  status: PaymentAccountStatus;

  /** Live account-level capabilities reported by the provider. */
  capabilities: PaymentAccountCapability[];

  /** When the provider credential was first saved in Graphify. Null if unavailable. */
  connectedAt: Date | null;

  /** Last time the connection was successfully verified. Null if never tested. */
  verifiedAt: Date | null;
}
