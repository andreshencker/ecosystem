import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { Channel } from '../../channels-catalogue/schemas/channel-catalog.schema';

export type ProviderDocument = HydratedDocument<Provider> & {
  createdAt: Date;
  updatedAt: Date;
};

export type ProviderConnectionType =
  | 'api_key'
  | 'smtp'
  | 'oauth'
  | 'access_keys'
  | 'app_password';

@Schema({ collection: 'providers', versionKey: false, timestamps: true })
export class Provider {
  @Prop({
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true,
  })
  providerKey!: string; // ej: "gmail", "twilio", "aws-s3"

  @Prop({ required: true, trim: true })
  displayName!: string; // ej: "Gmail", "Twilio", "Amazon S3"

  // ✅ SOLO referencia al canal (Channel)
  @Prop({
    type: Types.ObjectId,
    ref: Channel.name,
    required: true,
    index: true,
  })
  channelId!: Types.ObjectId;

  @Prop({ required: true, enum: ['api_key', 'smtp', 'oauth', 'access_keys', 'app_password'] })
  connectionType!: ProviderConnectionType;

  @Prop({ default: true, index: true })
  isActive!: boolean;
}

export const ProviderSchema = SchemaFactory.createForClass(Provider);

// búsquedas útiles
ProviderSchema.index({ channelId: 1, providerKey: 1 });
ProviderSchema.index({ isActive: 1, providerKey: 1 });
ProviderSchema.index({ isActive: 1, channelId: 1 });
