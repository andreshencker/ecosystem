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
  | 'app_password'
  | 'token';

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

  @Prop({ trim: true })
  description?: string;

  // Multi-channel: a provider may belong to one or more channels.
  // Single-channel providers have exactly one element (e.g. [emailChannelId]).
  // Multi-channel providers (e.g. Xero) have two or more.
  @Prop({
    type: [{ type: Types.ObjectId, ref: Channel.name }],
    required: true,
    default: [],
  })
  channelIds!: Types.ObjectId[];

  @Prop({
    required: true,
    enum: ['api_key', 'smtp', 'oauth', 'access_keys', 'app_password', 'token'],
  })
  connectionType!: ProviderConnectionType;

  @Prop({ default: true, index: true })
  isActive!: boolean;
}

export const ProviderSchema = SchemaFactory.createForClass(Provider);

// búsquedas útiles (channelIds is an array — MongoDB matches any element)
ProviderSchema.index({ channelIds: 1, providerKey: 1 });
ProviderSchema.index({ isActive: 1, providerKey: 1 });
ProviderSchema.index({ isActive: 1, channelIds: 1 });
