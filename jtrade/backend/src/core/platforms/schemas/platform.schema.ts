import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PlatformDocument = Platform & Document;

export enum PlatformCategory {
  EXCHANGE = 'exchange',
  BROKER = 'broker',
  DATA = 'data',
  CUSTODY = 'custody',
  OTHER = 'other',
}

export enum ConnectionType {
  APIKEY = 'apikey',
  OAUTH = 'oauth',
  NONE = 'none',
}

@Schema({ timestamps: true })
export class Platform {
  @Prop({ required: true, trim: true, unique: true })
  name: string;

  @Prop({ type: String, enum: Object.values(PlatformCategory), required: true })
  category: PlatformCategory;

  @Prop({ trim: true, default: '' })
  imageUrl?: string;

  @Prop({ default: true })
  isActive: boolean;

  /** Indica si el frontend/backend tienen soporte para esta plataforma */
  @Prop({ default: false })
  isSupported: boolean;

  /** Tipo de conexión de esta plataforma (APIKEY u OAUTH) */
  @Prop({ type: String, enum: Object.values(ConnectionType), required: true })
  connectionType: ConnectionType;
}

export const PlatformSchema = SchemaFactory.createForClass(Platform);

PlatformSchema.index({ category: 1, isActive: 1 });
PlatformSchema.index({ connectionType: 1, isSupported: 1 });
