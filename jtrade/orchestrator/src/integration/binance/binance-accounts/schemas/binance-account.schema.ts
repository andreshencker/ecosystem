// src/integrations/binance/binance-accounts/schemas/binance-account.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BinanceAccountDocument = HydratedDocument<BinanceAccount>;

@Schema({ timestamps: true, collection: 'binance_accounts' })
export class BinanceAccount {
  @Prop({ type: String, required: true, index: true })
  userPlatformId!: string; // 1 UserPlatform -> N BinanceAccount

  @Prop({ type: String, required: true })
  apiKey!: string;

  @Prop({ type: String, required: true }) // cifrada
  apiSecret!: string;

  @Prop({ type: String, default: '' })
  description?: string;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ type: Boolean, default: false, index: true })
  isDefault!: boolean;

  @Prop({ type: Date, default: Date.now })
  createdAt?: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt?: Date;
}

export const BinanceAccountSchema =
  SchemaFactory.createForClass(BinanceAccount);

// 1) Evitar descripciones duplicadas por plataforma (opcional)
BinanceAccountSchema.index(
  { userPlatformId: 1, description: 1 },
  {
    unique: true,
    partialFilterExpression: { description: { $type: 'string' } },
  },
);

// 2) Evitar duplicar la misma apiKey en la misma plataforma
BinanceAccountSchema.index({ userPlatformId: 1, apiKey: 1 }, { unique: true });
