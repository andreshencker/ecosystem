import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { Product } from '../../products/schemas/product.schema';
import { ProductPricing } from '../../product-pricing/schemas/product-pricing.schema';

export type OrderDocument = HydratedDocument<Order>;
export type OrderStatus = 'active' | 'cancelled' | 'expired' | 'past_due' | 'refunded';

/**
 * One client's purchase of one product. Snapshots the price and promotion it
 * Snapshots the selected pricing option, so later edits never rewrite a sale.
 */
@Schema({ collection: 'orders', timestamps: true, versionKey: false })
export class Order {
  @Prop({ type: SchemaTypes.ObjectId, ref: Product.name, required: true, index: true }) productId!: Types.ObjectId;
  /** Seller. */
  @Prop({ required: true, trim: true, index: true }) providerOrganizationId!: string;

  /** Buyer. */
  @Prop({ required: true, trim: true, index: true }) clientGrapiflyUserId!: string;
  @Prop({ required: true, trim: true, index: true }) clientOrganizationId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: ProductPricing.name, required: true }) pricingId!: Types.ObjectId;
  @Prop({ required: true, trim: true }) pricingKey!: string;
  @Prop({ required: true, trim: true }) pricingName!: string;

  /** Minor units (cents). */
  @Prop({ type: Number, required: true, min: 0 }) baseAmount!: number;
  @Prop({ type: Number, required: true, min: 0 }) discountAmount!: number;
  @Prop({ type: Number, required: true, min: 0 }) amountPaid!: number;
  @Prop({ type: String, enum: ['USD'], default: 'USD' }) currency!: string;

  @Prop({ required: true, enum: ['one_time', 'recurring'] }) pricingType!: 'one_time' | 'recurring';
  @Prop({ type: String, enum: ['month', 'year'], default: null }) interval!: 'month' | 'year' | null;
  @Prop({ type: Number, default: null, min: 1 }) intervalCount!: number | null;
  @Prop({ type: String, enum: ['percentage', 'fixed_amount', 'direct_price'], default: null }) promotionType!: string | null;
  @Prop({ type: Number, default: null, min: 0 }) promotionValue!: number | null;

  @Prop({ required: true, enum: ['active', 'cancelled', 'expired', 'past_due', 'refunded'], default: 'active', index: true }) status!: OrderStatus;

  @Prop({ type: Date, required: true, default: Date.now }) startedAt!: Date;
  @Prop({ type: Date, default: null }) currentPeriodEnd!: Date | null;
  @Prop({ type: Date, default: null }) cancelledAt!: Date | null;

  /** True while the client is inside the price's free-trial window. */
  @Prop({ type: Boolean, default: false }) isTrial!: boolean;
  @Prop({ type: Date, default: null }) trialEndsAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ providerOrganizationId: 1, createdAt: -1 });
OrderSchema.index({ clientGrapiflyUserId: 1, createdAt: -1 });
OrderSchema.index(
  { productId: 1, clientGrapiflyUserId: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } },
);
