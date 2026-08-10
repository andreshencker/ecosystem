// src/payments/contracts/payment-reference-data.contract.ts
//
// Canonical contract for provider-backed reference data.
//
// Reference data supplies controlled option lists for dynamic form fields.
// Every source is a named, validated concept — not an arbitrary string.
//
// Security rules:
//   - Never include API tokens, secret keys, decrypted credentials, or raw
//     provider headers in any response.
//   - All option values and labels must be safe to render in the UI.
//   - Metadata must never include sensitive provider payloads.

// ─── Source enum ─────────────────────────────────────────────────────────────

/**
 * Controlled set of reference-data sources.
 *
 * Each source represents a distinct, semantically meaningful concept.
 * The generic frontend must never derive one source from another — it must
 * request exactly the source declared by the field definition.
 *
 * price_currencies   — fiat currencies valid for the merchant order price.
 * receive_currencies — assets the merchant settles into (what they receive).
 * payment_assets     — assets a buyer can use to pay at checkout.
 * payment_methods    — payment method configurations for the connection.
 * refund_reasons     — canonical refund reason options.
 * countries          — country options for provider-specific address fields.
 * networks           — blockchain network / platform options.
 * webhook_events     — event types a webhook endpoint can subscribe to.
 */
export type PaymentReferenceDataSource =
  | 'price_currencies'
  | 'receive_currencies'
  | 'payment_assets'
  | 'payment_methods'
  | 'refund_reasons'
  | 'countries'
  | 'networks'
  | 'webhook_events';

export const VALID_REFERENCE_DATA_SOURCES: ReadonlySet<PaymentReferenceDataSource> =
  new Set([
    'price_currencies',
    'receive_currencies',
    'payment_assets',
    'payment_methods',
    'refund_reasons',
    'countries',
    'networks',
    'webhook_events',
  ]);

export function isValidReferenceDataSource(
  value: string,
): value is PaymentReferenceDataSource {
  return VALID_REFERENCE_DATA_SOURCES.has(value as PaymentReferenceDataSource);
}

// ─── Option type ─────────────────────────────────────────────────────────────

/**
 * A single selectable option returned by a reference-data source.
 *
 * `value` is what gets submitted. It must be stable and provider-meaningful.
 * For multi-platform assets (e.g. USDT on TRC20) the value must be opaque
 * enough to unambiguously identify the asset+network combination.
 *
 * `metadata` may carry safe auxiliary data (e.g. provider integer IDs) that
 * the provider adapter uses internally. It must never carry secrets.
 */
export interface PaymentReferenceDataOption {
  /** The canonical value submitted when this option is selected. */
  value: string;
  /** Human-readable label shown in the UI. */
  label: string;
  /** Optional group header for visually grouping options (e.g. "Fiat", "Crypto"). */
  group?: string;
  /** Optional short description shown as helper text below the label. */
  description?: string;
  /** When true, the option is shown but cannot be selected. */
  disabled?: boolean;
  /**
   * Safe auxiliary data from the provider.
   * The generic frontend must not act on this for business logic.
   * Provider adapters may use it to map the selected value back to
   * provider-specific fields (e.g. integer currency IDs).
   * Must never include API tokens, secrets, or raw sensitive payloads.
   */
  metadata?: Record<string, unknown>;
}

// ─── Response type ────────────────────────────────────────────────────────────

export interface PaymentReferenceDataResponse {
  /** Stable provider key — identifies which provider produced this result. */
  providerKey: string;
  /** ProviderCredentials._id of the selected connection. */
  connectionId: string;
  /** The source that was requested. */
  source: PaymentReferenceDataSource;
  /** Ordered option list. The generic frontend renders these exactly as returned. */
  options: PaymentReferenceDataOption[];
  /**
   * Metadata about how the options were produced.
   * authoritative: true when options come directly from a live provider call.
   * providerBacked: true when at least the source is from the provider (even if
   *                 filtered/supplemented locally).
   */
  meta?: {
    authoritative: boolean;
    providerBacked: boolean;
    environment?: 'test' | 'live' | 'unknown';
    note?: string;
  };
}

// ─── Context for provider resolution ─────────────────────────────────────────

export interface PaymentReferenceDataContext {
  companyId: string;
  providerCredentialId: string;
  providerKey: string;
  environment: 'test' | 'live' | null;
  /**
   * Pre-decrypted credentials — in-memory only for this request.
   * Must not be serialised, logged, or returned to callers.
   * Required because some providers (e.g. CoinGate) need authentication
   * to call their reference-data endpoints (e.g. GET /currencies).
   */
  credentials: Record<string, unknown>;
  effectiveCapabilities: Record<string, unknown>;
}
