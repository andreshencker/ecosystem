import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type IndicatorDocument = HydratedDocument<Indicator>;

export const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1'] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

/**
 * One alert the indicator emits: a single symbol on a single timeframe, with a
 * BUY key and a SELL key. The provider pastes those two keys into the matching
 * TradingView alerts; whichever key arrives on the product webhook tells the
 * system the symbol, timeframe and direction. The subdocument `_id` is the
 * stable channel id that client subscriptions point at (it survives key
 * rotation). `symbolId` always references a Symbol in the same provider org.
 */
@Schema()
export class IndicatorPair {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Symbol', required: true })
  symbolId!: Types.ObjectId;

  @Prop({ type: String, enum: TIMEFRAMES, required: true })
  timeframe!: Timeframe;

  /** Opaque credential pasted into the TradingView BUY alert. Rotatable. */
  @Prop({ type: String, required: true })
  buyKey!: string;

  /** Opaque credential pasted into the TradingView SELL alert. Rotatable. */
  @Prop({ type: String, required: true })
  sellKey!: string;

  @Prop({ type: Boolean, default: true })
  enabled!: boolean;

  @Prop({ type: Date, default: null })
  lastSignalAt!: Date | null;
}

export const IndicatorPairSchema = SchemaFactory.createForClass(IndicatorPair);

/**
 * An indicator is a reusable signal-source *definition* owned by a provider
 * organization: a name, its TradingView webhook, and the (symbol, timeframe)
 * alerts it emits. The webhook lives here (not on the product) so the provider
 * sets up TradingView once per alert regardless of how many products bundle the
 * indicator. Ownership is the Grapifly organization id from the caller's JWT
 * (`AuthContext.organizationId`), never the request body.
 */
@Schema({ collection: 'indicators', timestamps: true, versionKey: false })
export class Indicator {
  @Prop({ required: true, trim: true, index: true })
  providerOrganizationId!: string;

  @Prop({ required: true, trim: true })
  createdByGrapiflyUserId!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, lowercase: true, trim: true })
  key!: string;

  @Prop({ trim: true, default: '' })
  description!: string;

  /**
   * 32-hex slug in the public webhook path (`/webhooks/tv/:slug`). Coarse gate +
   * kill-switch: rotating it invalidates every TradingView alert for this
   * indicator at once. The per-alert buyKey/sellKey still identify the channel.
   */
  @Prop({ required: true, trim: true })
  webhookSlug!: string;

  @Prop({ type: Date, default: null })
  webhookLastReceivedAt!: Date | null;

  /** (symbol, timeframe) alerts this indicator produces signals for. */
  @Prop({ type: [IndicatorPairSchema], default: [] })
  pairs!: IndicatorPair[];

  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const IndicatorSchema = SchemaFactory.createForClass(Indicator);

IndicatorSchema.index({ providerOrganizationId: 1, key: 1 }, { unique: true });
IndicatorSchema.index({ providerOrganizationId: 1, isActive: 1, name: 1 });
IndicatorSchema.index({ webhookSlug: 1 }, { unique: true });
// Webhook ingestion resolves an incoming key to its channel.
IndicatorSchema.index({ 'pairs.buyKey': 1 });
IndicatorSchema.index({ 'pairs.sellKey': 1 });
