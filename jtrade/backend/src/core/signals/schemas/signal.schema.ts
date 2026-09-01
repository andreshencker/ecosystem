import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type SignalDocument = HydratedDocument<Signal>;

export enum SignalAction {
  BUY = 'BUY',
  SELL = 'SELL',
}

/**
 * One signal that arrived on an indicator's webhook. The raw record — matched to
 * clients and turned into an actionable envelope by the signalbots module.
 * Adapted from the legacy `signals` collection: `adminIndicatorId` dropped (the
 * webhook lives on the indicator now), `alertId` -> `channelId` (Indicator.pairs._id),
 * `indicatorId` is now the real indicator.
 */
@Schema({ collection: 'signals', timestamps: true, versionKey: false })
export class Signal {
  @Prop({ required: true, trim: true, index: true })
  signalId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Indicator', required: true, index: true })
  indicatorId!: Types.ObjectId;

  /** The alert channel — `Indicator.pairs._id`. */
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  channelId!: Types.ObjectId;

  @Prop({ required: true, enum: Object.values(SignalAction), index: true })
  action!: SignalAction;

  @Prop({ required: true, uppercase: true, trim: true, index: true })
  symbol!: string;

  @Prop({ required: true, uppercase: true, trim: true })
  timeFrame!: string;

  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;

  /** Candle the signal belongs to. */
  @Prop({ type: Date, default: null })
  barTime!: Date | null;

  /** The EA must not act after this. */
  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SignalSchema = SchemaFactory.createForClass(Signal);

SignalSchema.index({ channelId: 1, createdAt: -1 });
SignalSchema.index({ indicatorId: 1, symbol: 1, timeFrame: 1, createdAt: -1 });
SignalSchema.index({ isActive: 1, createdAt: -1 });
