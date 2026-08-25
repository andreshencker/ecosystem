// src/payments/types/payment.types.ts

import type {
  PaymentCapability,
  CapabilityStatus,
} from '../enums/payment.enums';

// ─── Money ───────────────────────────────────────────────────────────────────

/**
 * Provider-independent monetary value.
 *
 * Uses the smallest currency unit (minor unit) to avoid floating-point errors.
 * The minor-unit factor varies by currency — do not assume 2 decimal places.
 *
 * Examples:
 *   { amountMinor: 5000, currency: 'AUD' } → AUD 50.00
 *   { amountMinor: 5000, currency: 'JPY' } → JPY 5000 (yen has no minor unit)
 *   { amountMinor: 5000, currency: 'KWD' } → KWD 5.000 (3 decimal places)
 */
export interface PaymentMoney {
  /** Amount in the smallest currency unit. Must be a non-negative integer. */
  amountMinor: number;
  /** ISO 4217 currency code (e.g. 'AUD', 'USD', 'JPY'). */
  currency: string;
}

// ─── Provider metadata ────────────────────────────────────────────────────────

export interface PaymentProviderCapabilities {
  /**
   * Map of capability → status.
   * Only capabilities the provider is aware of need to appear here.
   * Absent capabilities are implicitly Unsupported.
   */
  capabilities: Partial<Record<PaymentCapability, CapabilityStatus>>;
}

export interface PaymentProviderMetadata {
  providerKey: string;
  displayName: string;
  description: string;
  connectionType: string;
}

// ─── Connection ───────────────────────────────────────────────────────────────

/**
 * Normalized result returned by any payment provider's connection test.
 *
 * Design rules:
 *   - Contains only provider-independent fields at the top level.
 *   - Provider-specific information (e.g. Stripe environment, account ID)
 *     belongs inside `metadata`, never promoted to top-level fields.
 *   - Provider SDK types must never appear in this interface.
 *   - Credential values must never appear here.
 */
export interface PaymentProviderConnectionResult {
  /** Whether the credentials authenticated successfully against the provider. */
  connected: boolean;

  /** Stable provider key — identifies which provider produced this result. */
  providerKey: string;

  /** Timestamp of when the check was performed. */
  checkedAt: Date;

  /** Human-readable diagnostic message — present for both success and failure. */
  message?: string;

  /**
   * Provider-specific, non-sensitive data returned from the connection check.
   * All values must be safe to surface in the UI — no credentials, no secrets.
   *
   * Example for Stripe:
   *   { environment: 'test', accountIdentifier: 'acct_...', displayName: '...', ... }
   */
  metadata?: Record<string, unknown>;
}

// ─── Runtime context ─────────────────────────────────────────────────────────

/**
 * Fully resolved provider context for a single request.
 * Credentials are decrypted, in-memory only — never persisted or logged.
 */
export interface PaymentProviderContext {
  readonly providerKey: string;
  readonly connectionType: string;
  readonly credentialsId: string;
  readonly isActive: boolean;
  /**
   * Pre-decrypted credentials.
   * Scope: current request only. Must not be serialised or returned to callers.
   */
  readonly credentials: Record<string, unknown>;
}

// ─── Runtime orchestration context ───────────────────────────────────────────

/**
 * Minimal provider identity interface used by PaymentProviderRuntimeContext.
 *
 * Declared here (rather than importing IPaymentProvider) to avoid a circular
 * dependency between payment.types.ts and payment-provider.interface.ts, which
 * already imports from this file.
 *
 * TypeScript structural typing ensures that IPaymentProvider satisfies this
 * interface at every assignment site — no explicit cast needed.
 */
export interface PaymentProviderRef {
  readonly providerKey: string;
  getCapabilities(): PaymentProviderCapabilities;
  getMetadata(): PaymentProviderMetadata;
}

/**
 * Fully resolved runtime context produced by PaymentsService.resolveRuntime().
 *
 * This is the richest resolution result — it includes the adapter reference so
 * that service layers can call provider operations without re-resolving.
 *
 * Security rules (same as PaymentProviderContext):
 *   - `credentials` is in-memory only; never serialised, logged, or returned.
 *   - `environment` may be null when the provider cannot determine it from
 *     credential structure alone (e.g. OAuth-only providers).
 */
export interface PaymentProviderRuntimeContext {
  /** = ProviderCredentials._id (the canonical Payments "accountId"). */
  readonly accountId: string;

  /** Extracted from the authenticated JWT — never from the request body. */
  readonly companyId: string;

  /** Stable canonical provider key (e.g. 'stripe', 'paypal'). */
  readonly providerKey: string;

  /** Execution environment determined from credentials. Null if indeterminate. */
  readonly environment: 'test' | 'live' | null;

  /**
   * The resolved provider adapter.
   * Satisfies IPaymentProvider at the call site via structural typing.
   */
  readonly provider: PaymentProviderRef;

  /**
   * Pre-decrypted credential payload.
   * Scope: current request only.
   * Must not be serialised, persisted, or included in responses or logs.
   */
  readonly credentials: Record<string, unknown>;
}

// ─── Generic metadata bag ─────────────────────────────────────────────────────

/**
 * Arbitrary key-value metadata for annotating payment operations.
 * Future use — not yet applied to any persisted model.
 */
export type PaymentMetadata = Record<string, string | number | boolean | null>;
