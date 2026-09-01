import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type SignalResultDocument = HydratedDocument<SignalResult>;

/** What the EA did with a delivered signal — the fill report. Feeds P&L / history. */
@Schema({ collection: 'signal_results', timestamps: true, versionKey: false })
export class SignalResult {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Signalbot', required: true, index: true })
  signalbotId!: Types.ObjectId;

  @Prop({ required: true, trim: true, index: true }) signalId!: string;
  @Prop({ required: true, trim: true }) grapiflyUserId!: string;
  @Prop({ required: true, trim: true }) providerOrganizationId!: string;

  @Prop({ type: String, trim: true, default: null }) ticket!: string | null;
  @Prop({ type: Number, default: null }) entryPrice!: number | null;
  @Prop({ type: Number, default: null }) slippage!: number | null;
  @Prop({ type: String, trim: true, default: null }) error!: string | null;

  @Prop({ required: true, enum: ['filled', 'failed'], index: true }) status!: 'filled' | 'failed';

  createdAt?: Date;
  updatedAt?: Date;
}

export const SignalResultSchema = SchemaFactory.createForClass(SignalResult);
SignalResultSchema.index({ signalbotId: 1, createdAt: -1 });
