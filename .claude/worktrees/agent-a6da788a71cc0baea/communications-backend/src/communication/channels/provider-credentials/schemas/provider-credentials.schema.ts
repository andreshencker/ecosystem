import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type ProviderCredentialsDocument =
  HydratedDocument<ProviderCredentials> & {
    createdAt: Date;
    updatedAt: Date;
  };

export type EncryptedPayload = {
  alg: string;
  ivBase64: string;
  tagBase64: string;
  dataBase64: string;
};

@Schema({
  collection: 'provider_credentials',
  versionKey: false,
  timestamps: true,
})
export class ProviderCredentials {
  @Prop({
    type: Types.ObjectId,
    ref: 'CompanyChannelProvider',
    required: true,
    index: true, // ✅ útil
  })
  companyChannelProviderId!: Types.ObjectId;

  // ✅ obligatorio: "marketing", "support", etc.
  @Prop({ required: true, trim: true, lowercase: true })
  tag!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  encrypted!: EncryptedPayload;

  @Prop({ default: true, index: true })
  isActive!: boolean;
}

export const ProviderCredentialsSchema =
  SchemaFactory.createForClass(ProviderCredentials);

// ✅ único por (companyChannelProviderId + tag)
ProviderCredentialsSchema.index(
  { companyChannelProviderId: 1, tag: 1 },
  { unique: true, name: 'uniq_ccp_tag' },
);
