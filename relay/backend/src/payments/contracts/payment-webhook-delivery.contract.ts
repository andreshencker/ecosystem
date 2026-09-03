// src/payments/contracts/payment-webhook-delivery.contract.ts
//
// Technical contract for webhook delivery records stored locally.
// These are integration / diagnostic records — NOT duplicated business resources.

export type WebhookSignatureStatus =
  | 'valid'
  | 'invalid'
  | 'missing'
  | 'not_supported'
  | 'unknown';

export type WebhookProcessingStatus =
  | 'received'
  | 'verified'
  | 'processing'
  | 'processed'
  | 'failed'
  | 'ignored'
  | 'duplicate';

/**
 * Webhook delivery summary — one row in the delivery table.
 * Sourced from the local WebhookDelivery technical record.
 */
export interface WebhookDeliverySummary {
  /** WebhookDelivery._id as string. */
  id: string;
  provider: string;
  connectionId: string;
  providerEventId: string;
  eventType: string;
  objectType?: string;
  objectId?: string;
  processingStatus: WebhookProcessingStatus;
  signatureStatus: WebhookSignatureStatus;
  duplicate: boolean;
  receivedAt: Date;
  processedAt?: Date;
  attemptCount: number;
  lastErrorCode?: string;
  lastErrorMessage?: string;
}

/**
 * Extended delivery detail.
 */
export interface WebhookDeliveryDetail extends WebhookDeliverySummary {
  providerApiVersion?: string;
  livemode?: boolean;
  requestId?: string;
  /** Stripe Connect account that emitted the event, when applicable. */
  connectedAccountId?: string;
  payloadHash?: string;
  safePayloadSummary?: Record<string, unknown>;
  rawPayloadAvailable: boolean;
  processingStartedAt?: Date;
  processingCompletedAt?: Date;
}

export interface WebhookDeliveryListResult {
  data: WebhookDeliverySummary[];
  hasMore: boolean;
  total: number;
}

export interface ListWebhookDeliveriesParams {
  limit?: number;
  offset?: number;
  eventType?: string;
  processingStatus?: string;
  signatureStatus?: string;
  duplicate?: boolean;
  receivedFrom?: Date;
  receivedTo?: Date;
  search?: string;
}

/**
 * Result returned by the provider adapter's signature verification.
 * Contains only safe, non-secret data derived from the verified event.
 */
export interface VerifiedWebhookEvent {
  providerEventId: string;
  eventType: string;
  createdAt: Date;
  livemode: boolean;
  apiVersion?: string;
  objectType?: string;
  objectId?: string;
  requestId?: string;
  /** Stripe Connect account that emitted the event, when applicable. */
  connectedAccountId?: string;
  /** Safe canonical summary of the event object — no sensitive values. */
  safePayloadSummary?: Record<string, unknown>;
}
