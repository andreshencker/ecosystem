import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { Product } from '../../products/schemas/product.schema';

export type SignalbotDocument = HydratedDocument<Signalbot>;

/**
 * One alert channel this account trades. Fields ported verbatim from the legacy
 * `symbol_executions` collection; `alertGroupId` -> `channelId` (Indicator.pairs._id).
 */
@Schema({ _id: false })
export class SymbolExecution {
  @Prop({ type: SchemaTypes.ObjectId, required: true }) channelId!: Types.ObjectId;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Indicator', required: true }) indicatorId!: Types.ObjectId;
  @Prop({ required: true, uppercase: true, trim: true }) symbol!: string;
  @Prop({ required: true, uppercase: true, trim: true }) timeFrame!: string;

  @Prop({ type: Number, default: 0 }) contractSize!: number;
  @Prop({ type: Number, default: 0 }) riskPercent!: number;
  @Prop({ type: Number, default: 0 }) stopDistancePips!: number;
  @Prop({ type: Number, default: 0 }) returnRatio!: number;
  @Prop({ type: Boolean, default: true }) isActive!: boolean;
  @Prop({ type: Boolean, default: true }) useStopLoss!: boolean;
  @Prop({ type: Boolean, default: true }) useTakeProfit!: boolean;
  @Prop({ type: Boolean, default: false }) useTrailingStop!: boolean;
  @Prop({ type: Boolean, default: true }) useBreakEven!: boolean;
  @Prop({ type: Number, default: 0 }) atrPeriod!: number;
  @Prop({ type: Number, default: 0 }) atrMultiplier!: number;
  @Prop({ type: Boolean, default: false }) closeTradesOnWeekend!: boolean;
}
export const SymbolExecutionSchema = SchemaFactory.createForClass(SymbolExecution);

/**
 * A client's configured bot: one trading account running one product, with the
 * account-level settings and the per-channel executions. Union of the legacy
 * `user_account_info` (top-level) + `symbol_executions` (the array). Refs adapted
 * to the new model — `userProjectPlatformId` -> `grapiflyUserId` + `productId`.
 */
@Schema({ collection: 'signalbots', timestamps: true, versionKey: false })
export class Signalbot {
  @Prop({ required: true, trim: true, index: true }) grapiflyUserId!: string;
  @Prop({ required: true, trim: true }) clientOrganizationId!: string;
  @Prop({ type: SchemaTypes.ObjectId, ref: Product.name, required: true, index: true }) productId!: Types.ObjectId;
  @Prop({ required: true, trim: true, index: true }) providerOrganizationId!: string;

  /** The EA polls the runtime endpoint with this. */
  @Prop({ required: true, trim: true }) token!: string;

  // ── from user_account_info ──
  @Prop({ type: String, trim: true, default: null }) accountRef!: string | null;
  @Prop({ type: String, trim: true, default: null }) accountLabel!: string | null;
  @Prop({ type: Boolean, default: false }) canTrade!: boolean;
  @Prop({ type: Boolean, default: false }) useDrawdownLimit!: boolean;
  @Prop({ type: Boolean, default: false }) useProfitLimit!: boolean;
  @Prop({ type: Number, default: 0 }) maxDrawdownPercent!: number;
  @Prop({ type: Number, default: 0 }) maxProfitPercent!: number;
  @Prop({ type: Boolean, default: true, index: true }) isActive!: boolean;

  // ── from symbol_executions ──
  @Prop({ type: [SymbolExecutionSchema], default: [] }) symbolExecutions!: SymbolExecution[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const SignalbotSchema = SchemaFactory.createForClass(Signalbot);

SignalbotSchema.index({ token: 1 }, { unique: true });
SignalbotSchema.index({ grapiflyUserId: 1, productId: 1 });
SignalbotSchema.index({ providerOrganizationId: 1, createdAt: -1 });
SignalbotSchema.index({ 'symbolExecutions.channelId': 1 });
