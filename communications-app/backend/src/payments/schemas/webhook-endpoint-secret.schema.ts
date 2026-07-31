// src/payments/schemas/webhook-endpoint-secret.schema.ts
//
// Encrypted storage for webhook endpoint signing secrets.
// Uses the same AES-256-GCM encryption as ProviderCredentials.
//
// The signing secret is written ONCE when a provider endpoint is created.
// It is decrypted only during signature verification — never returned to callers.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import type { EncryptedPayload } from '../../communication/common/security/crypto.service';

export type WebhookEndpointSecretDocument =
  HydratedDocument<WebhookEndpointSecret> & {
    createdAt: Date;
    updatedAt: Date;
  };

@Schema({
  collection: 'payment_webhook_endpoint_secrets',
  versionKey: false,
  timestamps: true,
})
export class WebhookEndpointSecret {
  /** ProviderCredentials._id — the payment connection this secret belongs to. */
  @Prop({ type: Types.ObjectId, required: true, index: true })
  providerCredentialId!: Types.ObjectId;

  /** Company isolation guard. */
  @Prop({ type: Types.ObjectId, required: true, index: true })
  companyId!: Types.ObjectId;

  /** Provider-native endpoint ID (Stripe: we_xxx). */
  @Prop({ required: true })
  providerEndpointId!: string;

  /**
   * AES-256-GCM encrypted signing secret.
   * Same encryption format as ProviderCredentials.encrypted.
   * Decrypted only during webhook signature verification.
   */
  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  encryptedSecret!: EncryptedPayload;

  /** True while the endpoint is active. Set to false on deletion. */
  @Prop({ default: true, index: true })
  isActive!: boolean;
}

export const WebhookEndpointSecretSchema = SchemaFactory.createForClass(
  WebhookEndpointSecret,
);

// Unique: each endpoint has exactly one active secret per connection.
WebhookEndpointSecretSchema.index(
  { providerCredentialId: 1, providerEndpointId: 1 },
  { unique: true, name: 'uniq_credential_endpoint' },
);
