// src/payments/schemas/webhook-delivery.schema.ts
//
// Technical integration record created when Graphify receives a provider webhook event.
//
// Purpose: idempotency, signature verification evidence, retry diagnostics, audit.
// Must NOT store Payment, Refund or Payout business records.
//
// Retention: TTL via expiresAt index. Safe payload summary retained longer than
// raw payload. Payload hash retained indefinitely for idempotency evidence.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type WebhookDeliveryDocument = HydratedDocument<WebhookDelivery> & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({
  collection: 'payment_webhook_deliveries',
  versionKey: false,
  timestamps: true,
})
export class WebhookDelivery {
  /** Company that owns this connection. */
  @Prop({ type: Types.ObjectId, required: true, index: true })
  companyId!: Types.ObjectId;

  /** CompanyChannelProvider._id — links to the payment channel configuration. */
  @Prop({ type: Types.ObjectId, required: true, index: true })
  companyChannelProviderId!: Types.ObjectId;

  /** ProviderCredentials._id — identifies the exact connection. */
  @Prop({ type: Types.ObjectId, required: true, index: true })
  providerCredentialId!: Types.ObjectId;

  /** Stable provider key (e.g. 'stripe'). */
  @Prop({ required: true })
  providerKey!: string;

  /**
   * Provider-native event ID (Stripe: evt_xxx).
   * Used for idempotency — combined with providerCredentialId as unique key.
   */
  @Prop({ required: true })
  providerEventId!: string;

  /** Provider event type string (e.g. 'payment_intent.succeeded'). */
  @Prop({ required: true, index: true })
  eventType!: string;

  /** Type of the primary object referenced by the event. */
  @Prop()
  objectType?: string;

  /** Provider-native ID of the primary object. */
  @Prop()
  objectId?: string;

  /** SHA-256 hex hash of the raw request body. Used for idempotency evidence. */
  @Prop({ required: true })
  payloadHash!: string;

  /**
   * Signature verification result.
   * 'valid' | 'invalid' | 'missing' | 'not_supported' | 'unknown'
   */
  @Prop({ required: true, index: true })
  signatureStatus!: string;

  /**
   * Internal processing lifecycle status.
   * 'received' | 'verified' | 'processing' | 'processed' | 'failed' | 'ignored' | 'duplicate'
   */
  @Prop({ required: true, index: true })
  processingStatus!: string;

  /** True when this event has already been processed (idempotency). */
  @Prop({ default: false, index: true })
  duplicate!: boolean;

  /** Number of internal processing attempts. */
  @Prop({ default: 0 })
  attemptCount!: number;

  /** When Graphify received the raw event. */
  @Prop({ required: true, index: true })
  receivedAt!: Date;

  /** When processing completed (success or terminal failure). */
  @Prop()
  processedAt?: Date;

  /** When internal processing started for the most recent attempt. */
  @Prop()
  processingStartedAt?: Date;

  /** Error code from the most recent failed attempt. */
  @Prop()
  lastErrorCode?: string;

  /** Safe error message from the most recent failed attempt. */
  @Prop()
  lastErrorMessage?: string;

  /** Provider API version string from the event envelope. */
  @Prop()
  providerApiVersion?: string;

  /** Whether the event was from the live environment. */
  @Prop()
  livemode?: boolean;

  /** Provider request ID for debugging. */
  @Prop()
  requestId?: string;

  /**
   * Safe canonical summary of the event object.
   * Sensitive values must be redacted before storing.
   * Retained longer than raw payload.
   */
  @Prop({ type: MongooseSchema.Types.Mixed })
  safePayload?: Record<string, unknown>;

  /**
   * Optional TTL date. When set, MongoDB will remove the document after this date.
   * Raw payloads are retained for a shorter period; use a separate scheduled job
   * to clear safePayload after the retention window if needed.
   */
  @Prop({ type: Date })
  expiresAt?: Date;
}

export const WebhookDeliverySchema =
  SchemaFactory.createForClass(WebhookDelivery);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Idempotency: connection-scoped unique key for each provider event.
WebhookDeliverySchema.index(
  { providerCredentialId: 1, providerEventId: 1 },
  { unique: true, name: 'uniq_credential_event' },
);

// Query indexes for the management UI.
WebhookDeliverySchema.index(
  { companyId: 1, processingStatus: 1 },
  { name: 'idx_company_status' },
);
WebhookDeliverySchema.index(
  { providerCredentialId: 1, receivedAt: -1 },
  { name: 'idx_credential_received' },
);
WebhookDeliverySchema.index(
  { providerCredentialId: 1, eventType: 1 },
  { name: 'idx_credential_eventtype' },
);

// TTL index — only applies to documents where expiresAt is set.
WebhookDeliverySchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: 'ttl_expires', sparse: true },
);
