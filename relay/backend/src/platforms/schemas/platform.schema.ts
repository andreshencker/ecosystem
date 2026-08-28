import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PlatformDocument = HydratedDocument<Platform> & {
  createdAt: Date;
  updatedAt: Date;
};

/** Trading platform reference catalogue (MT4, MT5, cTrader, TradingView, ...) — not tenant-scoped. */
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

  @Prop({ required: true, trim: true })
  websiteUrl!: string;

  @Prop({ default: '', trim: true })
  logoUrl!: string;

  @Prop({ default: true, index: true })
  isActive!: boolean;

  @Prop({ default: 0 })
  displayOrder!: number;
}

export const PlatformSchema = SchemaFactory.createForClass(Platform);
