import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PlatformDocument = HydratedDocument<Platform> & {
  createdAt: Date;
  updatedAt: Date;
};

/** Trading platform catalogue (MT4, MT5, cTrader, TradingView, ...). */
@Schema({
  collection: 'platforms',
  versionKey: false,
  timestamps: true,
})
export class Platform {
  @Prop({ required: true, trim: true, lowercase: true, unique: true })
  key!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ default: '', trim: true })
  description!: string;

  @Prop({ default: '', trim: true })
  logoUrl!: string;

  @Prop({ default: true, index: true })
  isActive!: boolean;

  /** Whether jtrade actually supports this platform today — shown to users as a readiness flag, independent of catalogue visibility (isActive). */
  @Prop({ default: false, index: true })
  isSupported!: boolean;
}

export const PlatformSchema = SchemaFactory.createForClass(Platform);
