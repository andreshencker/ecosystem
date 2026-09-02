import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { Product } from '../../products/schemas/product.schema';

export type ProductPricingDocument = HydratedDocument<ProductPricing>;
export type PricingType = 'one_time' | 'recurring';
export type PricingInterval = 'month' | 'year';
export type PricingStatus = 'active' | 'inactive';
export type PromotionType = 'percentage' | 'fixed_amount' | 'direct_price';

@Schema({ _id: false })
export class PricingPromotion {
  @Prop({ type: String, enum: ['percentage', 'fixed_amount', 'direct_price'], required: true })
  type!: PromotionType;
  /** Percentage or minor units, depending on type. */
  @Prop({ type: Number, required: true, min: 0 }) value!: number;
  @Prop({ type: Date, default: null }) startsAt!: Date | null;
  @Prop({ type: Date, default: null }) endsAt!: Date | null;
  @Prop({ type: Boolean, default: true }) isActive!: boolean;
}

export const PricingPromotionSchema = SchemaFactory.createForClass(PricingPromotion);

/** One purchasable option of a product (monthly, annual, lifetime, free, etc.). */
@Schema({ collection: 'product_pricing', timestamps: true, versionKey: false })
export class ProductPricing {
  @Prop({ type: SchemaTypes.ObjectId, ref: Product.name, required: true, index: true }) productId!: Types.ObjectId;
  @Prop({ required: true, trim: true, index: true }) providerOrganizationId!: string;
  @Prop({ required: true, trim: true, lowercase: true, maxlength: 80 }) key!: string;
  @Prop({ required: true, trim: true, maxlength: 120 }) name!: string;
  @Prop({ required: true, enum: ['one_time', 'recurring'] }) pricingType!: PricingType;
  /** Minor units (cents). Never a float. */
  @Prop({ type: Number, required: true, min: 0 }) amount!: number;
  @Prop({ type: String, enum: ['USD'], default: 'USD' }) currency!: 'USD';
  @Prop({ type: String, enum: ['month', 'year'], default: null }) interval!: PricingInterval | null;
  @Prop({ type: Number, default: null, min: 1, max: 120 }) intervalCount!: number | null;
  @Prop({ type: Boolean, default: false }) trialEnabled!: boolean;
  @Prop({ type: Number, default: 0, min: 0, max: 365 }) trialDays!: number;
  @Prop({ type: PricingPromotionSchema, default: null }) promotion!: PricingPromotion | null;
  @Prop({ required: true, enum: ['active', 'inactive'], default: 'active', index: true }) status!: PricingStatus;
  @Prop({ type: Boolean, default: false }) isDefault!: boolean;
  @Prop({ type: Number, default: 0, min: 0 }) displayOrder!: number;
  @Prop({ required: true, trim: true }) createdByGrapiflyUserId!: string;
  @Prop({ required: true, trim: true }) updatedByGrapiflyUserId!: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const ProductPricingSchema = SchemaFactory.createForClass(ProductPricing);
ProductPricingSchema.index({ productId: 1, key: 1 }, { unique: true });
ProductPricingSchema.index({ productId: 1, status: 1, displayOrder: 1 });
ProductPricingSchema.index(
  { productId: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } },
);
