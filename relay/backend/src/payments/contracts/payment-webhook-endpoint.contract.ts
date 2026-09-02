// src/payments/contracts/payment-webhook-endpoint.contract.ts
//
// Provider-centric webhook endpoint contract.
// Stripe (and future providers) are the source of truth for endpoint configuration.
// Graphify never duplicates endpoint config locally.
//
// IMPORTANT: The signing secret is NEVER included in list or detail responses.
// It is returned only once in the create result, as signingSecretOnce.

export type WebhookEndpointStatus = 'enabled' | 'disabled' | 'unknown';

/**
 * Webhook endpoint summary — one row in the endpoint list table.
 */
export interface WebhookEndpointSummary {
  /** = providerEndpointId; used as the DataGrid row key. */
  id: string;
  /** ProviderCredentials._id */
  accountId: string;
  providerKey: string;
  /** Provider-native endpoint ID (Stripe: we_xxx). */
  providerEndpointId: string;
  /** Full endpoint URL. */
  url: string;
  /** Canonical endpoint status. */
  status: WebhookEndpointStatus;
  /** Raw status string from the provider. */
  providerStatus: string;
  /** Number of enabled event types. */
  enabledEventCount: number;
  /** Provider API version this endpoint uses. */
  apiVersion?: string;
  /** Human-readable description. */
  description?: string;
  createdAt: Date;
  /** 'test' | 'live' derived from the provider response. */
  environment?: 'test' | 'live';
  metadata?: Record<string, string>;
}

/**
 * Extended endpoint detail — returned for single-endpoint retrieval.
 */
export interface WebhookEndpointDetail extends WebhookEndpointSummary {
  /** Full list of enabled event types. */
  enabledEvents: string[];
  /** True for Stripe Connect-forwarded events. */
  connect?: boolean;
  /** Platform application ID when applicable. */
  applicationId?: string;
  providerMetadata?: Record<string, string>;
}

/**
 * Returned only at creation time.
 * signingSecretOnce is present exactly once — never persisted, never re-fetched.
 *
 * Callers MUST display it to the user immediately and warn them it cannot
 * be retrieved again.
 */
export interface WebhookEndpointCreateResult extends WebhookEndpointDetail {
  /**
   * The signing secret returned by the provider at creation.
   * Present ONLY in the create response. Never returned again.
   * Must be stored by the caller.
   */
  signingSecretOnce?: string;
}

export interface WebhookEndpointListResult {
  data: WebhookEndpointSummary[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface CreateWebhookEndpointParams {
  url: string;
  enabledEvents: string[];
  description?: string;
  connect?: boolean;
  metadata?: Record<string, string>;
}

export interface UpdateWebhookEndpointParams {
  url?: string;
  enabledEvents?: string[];
  description?: string;
  disabled?: boolean;
  metadata?: Record<string, string>;
}

export interface ListWebhookEndpointsParams {
  limit?: number;
  cursor?: string;
}
