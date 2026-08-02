// src/company-channel-providers/schemas/company-channel-provider.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CompanyChannelProviderDocument =
  HydratedDocument<CompanyChannelProvider> & {
    createdAt: Date;
    updatedAt: Date;
  };

@Schema({
  collection: 'company_channel_providers',
  versionKey: false,
  timestamps: true,
})
export class CompanyChannelProvider {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Provider', required: true, index: true })
  providerId!: Types.ObjectId;

  // ✅ redundante a propósito para queries rápidas y validación sin populate profundo
  @Prop({ type: Types.ObjectId, ref: 'Channel', required: true, index: true })
  channelId!: Types.ObjectId;

  /**
   * ✅ Default provider por canal para una company.
   * Regla: solo puede existir 1 default por (companyId + channelId)
   */
  @Prop({ type: Boolean, default: false })
  isDefault!: boolean;

  @Prop({ default: true, index: true })
  isActive!: boolean;
}

export const CompanyChannelProviderSchema = SchemaFactory.createForClass(
  CompanyChannelProvider,
);

// A company may assign the same provider to different channels (e.g. Xero to
// both Accounting and Billing). The unique constraint is per (company, provider, channel).
CompanyChannelProviderSchema.index(
  { companyId: 1, providerId: 1, channelId: 1 },
  { unique: true, name: 'uniq_company_provider_channel' },
);

// ✅ Solo 1 default por canal (company + channel) usando índice parcial
CompanyChannelProviderSchema.index(
  { companyId: 1, channelId: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true },
    name: 'uniq_default_provider_per_channel',
  },
);

// consultas típicas
CompanyChannelProviderSchema.index(
  { companyId: 1, channelId: 1, isActive: 1 },
  { name: 'idx_company_channel_active' },
);
CompanyChannelProviderSchema.index(
  { companyId: 1, isActive: 1 },
  { name: 'idx_company_active' },
);
