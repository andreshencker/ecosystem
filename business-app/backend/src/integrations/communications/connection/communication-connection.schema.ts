import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type IntegrationConnectionDocument =
  HydratedDocument<IntegrationConnection> & {
    createdAt: Date;
    updatedAt: Date;
  };

/**
 * Generic integration connection — one record per Business per provider.
 *
 * TERMINOLOGY:
 *   businessId     = ID of the Business in Business App (this system)
 *   remoteCompanyId = ID of the Business in Communications App (the external system)
 *
 * MIGRATION NOTE: existing documents in the 'integration_connections' collection
 * use the field name 'companyId'. New documents use 'businessId'. To migrate:
 *   db.integration_connections.updateMany(
 *     { companyId: { $exists: true }, businessId: { $exists: false } },
 *     [{ $set: { businessId: '$companyId' } }, { $unset: 'companyId' }]
 *   )
 */
@Schema({
  collection: 'integration_connections',
  versionKey: false,
  timestamps: true,
})
export class IntegrationConnection {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  businessId!: Types.ObjectId;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  provider!: string;

  /** AES-256-GCM encrypted blob — contains { token: '<raw>' } */
  @Prop({ type: Object, required: true })
  encryptedToken!: object;

  /** First 12 chars of the raw token — safe for UI display. */
  @Prop({ type: String, default: '' })
  tokenPrefix!: string;

  /**
   * The ID of this Business inside Communications App.
   * Resolved automatically by calling GET /company-integrations/me on save/test.
   * Null if the token has never been successfully verified.
   */
  @Prop({ type: String, default: null })
  remoteCompanyId!: string | null;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ type: Date, default: null })
  lastTestedAt!: Date | null;

  @Prop({ type: String, enum: ['connected', 'failed'], default: null })
  lastStatus!: 'connected' | 'failed' | null;

  @Prop({ type: String, default: null })
  lastError!: string | null;
}

export const IntegrationConnectionSchema = SchemaFactory.createForClass(
  IntegrationConnection,
);

// One connection per Business per provider.
IntegrationConnectionSchema.index(
  { businessId: 1, provider: 1 },
  { unique: true, name: 'uniq_business_provider' },
);

// Legacy index for existing documents that still use 'companyId'.
IntegrationConnectionSchema.index(
  { companyId: 1, provider: 1 },
  { sparse: true, name: 'legacy_uniq_company_provider' },
);

// Backwards-compatibility aliases — existing imports of CommunicationConnection still compile.
export const CommunicationConnection = IntegrationConnection;
export const CommunicationConnectionSchema = IntegrationConnectionSchema;
export type CommunicationConnectionDocument = IntegrationConnectionDocument;
