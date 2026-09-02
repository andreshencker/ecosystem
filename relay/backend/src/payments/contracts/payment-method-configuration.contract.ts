// src/payments/contracts/payment-method-configuration.contract.ts
//
// Canonical representation of which payment methods an account can accept.
// Configuration only — not a transaction record.

import type { PaymentMethodType } from '../enums/payment-method-type.enum';
import type { PaymentMethodConfigurationStatus } from '../enums/payment-method-configuration-status.enum';

export type { PaymentMethodConfigurationStatus };

/**
 * Canonical payment method configuration for a provider account.
 *
 * Each record corresponds to one Stripe PaymentMethodConfiguration method field
 * (e.g. 'card', 'apple_pay', 'klarna'). The `id` equals the Stripe field key.
 *
 * Provider mapping:
 *   Stripe  → PaymentMethodConfiguration object (PMC API)
 *   PayPal  → Payment sources / funding instruments
 *   Square  → Tender types per location
 */
export interface PaymentMethodConfiguration {
  /**
   * Stable identifier for this configuration record.
   * For Stripe: equals the Stripe field key (e.g. 'card', 'apple_pay').
   */
  id: string;

  /** Account this configuration belongs to (= ProviderCredentials._id). */
  accountId: string;

  /** Canonical payment method type. */
  type: PaymentMethodType;

  /** Human-readable display name (e.g. 'Credit & Debit Cards'). */
  displayName: string;

  /**
   * Whether the provider account currently supports this method.
   * An unavailable method cannot be enabled regardless of other flags.
   */
  available: boolean;

  /** Whether this method is currently active for payer-facing checkout. */
  enabled: boolean;

  /**
   * Whether the operator can toggle this method through the Graphify API.
   * False when the parent/default configuration controls this method.
   */
  configurable: boolean;

  /** Operational status derived from availability and preference settings. */
  status: PaymentMethodConfigurationStatus;

  /**
   * Human-readable explanation when enabled is false or available is false.
   * Null when no reason applies.
   */
  reason: string | null;

  /** Currencies this method can process. Empty array — PMC API does not expose this. */
  supportedCurrencies: string[];

  /** Countries where this method is available. Empty array — PMC API does not expose this. */
  supportedCountries: string[];
}
