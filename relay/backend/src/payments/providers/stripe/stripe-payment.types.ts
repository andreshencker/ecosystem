// src/payments/providers/stripe/stripe-payment.types.ts
//
// Stripe-specific internal TypeScript types.
//
// Nothing in this file may be imported from outside
// src/payments/providers/stripe/.
//
// These types describe internal Stripe implementation details that must never
// leak into the shared Payments contracts.

/**
 * The Stripe API version used by all Stripe clients in this provider.
 * Centralised here so that a version upgrade touches one line.
 */
export type StripeApiVersion = '2026-06-24.dahlia';

/**
 * Stripe environment derived from the secret key prefix.
 * sk_test_ → test
 * sk_live_ → live
 * null      → unrecognised prefix (validation error)
 */
export type StripeKeyEnvironment = 'test' | 'live' | null;

/**
 * Internal configuration used to build a per-request Stripe client.
 * The secretKey is used only within the Stripe provider folder and must never
 * be returned, logged, or passed to shared contracts.
 */
export interface StripeClientConfig {
  readonly secretKey: string;
  readonly apiVersion: StripeApiVersion;
  readonly maxNetworkRetries: number;
  readonly timeoutMs: number;
}

/**
 * Safe, non-sensitive account metadata extracted from a Stripe Account object
 * after a successful connection test.
 * Only fields that are safe to surface in the UI are included.
 */
export interface StripeSafeAccountMetadata {
  readonly environment: 'test' | 'live';
  readonly accountIdentifier?: string; // e.g. 'acct_1Pp...'
  readonly displayName?: string; // business name or email
  readonly country?: string; // ISO 3166-1 alpha-2
  readonly defaultCurrency?: string; // ISO 4217 lowercase
}
