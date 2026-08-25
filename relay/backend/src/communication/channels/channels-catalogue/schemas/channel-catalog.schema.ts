// src/channels/channels-catalogue/schemas/channel.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ContentFormat = 'html' | 'text' | 'binary';

export type ChannelDocument = HydratedDocument<Channel> & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ collection: 'channels', versionKey: false, timestamps: true })
export class Channel {
  @Prop({
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true,
  })
  channelKey!: string; // email | sms |storage | ...

  @Prop({ required: true, trim: true })
  displayName!: string; // "Email", "SMS", "Storage"

  @Prop({ trim: true, default: '' })
  description?: string;

  @Prop({ required: true, enum: ['html', 'text', 'binary'], index: true })
  contentFormat!: ContentFormat;

  @Prop({ default: false })
  supportsTemplates!: boolean;

  @Prop({ default: false })
  supportsFiles!: boolean;

  @Prop({ default: true, index: true })
  isActive!: boolean;
}

export const ChannelSchema = SchemaFactory.createForClass(Channel);

// Índices extra (opcional)
ChannelSchema.index({ isActive: 1, channelKey: 1 });
