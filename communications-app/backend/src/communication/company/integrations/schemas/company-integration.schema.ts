import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type IntegrationEnvironment = 'development' | 'staging' | 'production';

export type CompanyIntegrationDocument = HydratedDocument<CompanyIntegration> & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({
  collection: 'company_integrations',
  versionKey: false,
  timestamps: true,
})
export class CompanyIntegration {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true, trim: true, lowercase: true })
  integrationKey!: string;

  @Prop({ required: true, trim: true })
  displayName!: string;

  @Prop({ type: String, default: '' })
  description!: string;

  @Prop({
    required: true,
    enum: ['development', 'staging', 'production'],
    default: 'development',
  })
  environment!: IntegrationEnvironment;

  /** SHA-256 hash of the raw token. Never returned to clients. */
  @Prop({ required: true })
  tokenHash!: string;

  /** Safe display prefix — first ~20 chars of the raw token, e.g. gpf_test_a1b2c3d4 */
  @Prop({ required: true })
  tokenPrefix!: string;

  @Prop({ default: true, index: true })
  isActive!: boolean;

  @Prop({ type: Date, default: null })
  lastUsedAt?: Date | null;

  @Prop({ type: Date, default: null })
  expiresAt?: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  createdBy?: Types.ObjectId | null;
}

export const CompanyIntegrationSchema =
  SchemaFactory.createForClass(CompanyIntegration);

// Unique key per company
CompanyIntegrationSchema.index(
  { companyId: 1, integrationKey: 1 },
  { unique: true, name: 'uniq_company_integration_key' },
);

// Active integrations per company
CompanyIntegrationSchema.index(
  { companyId: 1, isActive: 1 },
  { name: 'idx_company_active' },
);

// Token prefix lookup (fast display identification)
CompanyIntegrationSchema.index({ tokenPrefix: 1 }, { name: 'idx_token_prefix' });

// Expiry TTL queries
CompanyIntegrationSchema.index({ expiresAt: 1 }, { name: 'idx_expires_at' });
