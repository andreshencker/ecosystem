import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RefreshTokenDocument = HydratedDocument<RefreshToken> & {
  createdAt: Date;
};

@Schema({
  collection: 'refresh_tokens',
  versionKey: false,
  timestamps: { createdAt: true, updatedAt: false },
})
export class RefreshToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  // SHA-256 hash of the raw token returned to the client.
  @Prop({ required: true, unique: true })
  tokenHash!: string;

  @Prop({ default: false, index: true })
  isRevoked!: boolean;

  // Set when this token is rotated — points to the hash of the new token.
  // Used for reuse-attack detection.
  @Prop({ type: String, default: null })
  replacedByTokenHash!: string | null;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ type: String, default: null })
  companyId!: string | null;

  @Prop({ type: String, default: null })
  companyKey!: string | null;

  @Prop({ type: String, default: null })
  grapiflyOrganizationId!: string | null;

  @Prop({ type: String, enum: ['platform_admin', 'company_owner', 'company_admin', 'operator', 'viewer'], default: null })
  role!: string | null;

  @Prop({ type: String, enum: ['global', 'company'], default: null })
  scope!: string | null;

  @Prop({ type: [String], default: [] })
  permissions!: string[];

  @Prop({ type: String, enum: ['client', 'provider', 'internal'], default: null })
  flow!: string | null;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

// MongoDB TTL index — expired tokens are deleted automatically.
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Fast lookup by userId for session revocation.
RefreshTokenSchema.index({ userId: 1, isRevoked: 1 });
