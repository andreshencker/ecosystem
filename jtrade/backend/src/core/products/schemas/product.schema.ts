import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { TypeProduct } from '../../type-products/schemas/type-product.schema';
import { Platform } from '../../platforms/schemas/platform.schema';

export type ProductDocument = HydratedDocument<Product>;
export type ProductStatus = 'draft' | 'pending_review' | 'published' | 'suspended' | 'archived';

/** A single optional promotion window on top of a platform's base price — not a coupon system, just "is this platform on sale right now". */
@Schema({ _id: false })
export class ProductPlatformDiscount {
  @Prop({ required: true, enum: ['percentage', 'fixed'] }) type!: 'percentage' | 'fixed';
  /** percentage: 0-100. fixed: minor units (cents), same currency as the platform's price. */
  @Prop({ required: true, min: 0 }) value!: number;
  @Prop({ type: Date, default: null }) startsAt!: Date | null;
  @Prop({ type: Date, default: null }) endsAt!: Date | null;
  @Prop({ default: true }) isActive!: boolean;
}
const ProductPlatformDiscountSchema = SchemaFactory.createForClass(ProductPlatformDiscount);

@Schema({ _id: false })
export class ProductPlatform {
  @Prop({ type: SchemaTypes.ObjectId, ref: Platform.name, required: true }) platformId!: Types.ObjectId;
  @Prop({ required: true, enum: ['download', 'webhook', 'api', 'cloud', 'managed'], default: 'download' }) deliveryMode!: string;
  @Prop({ required: true, enum: ['none', 'signal_based', 'bot_execution', 'copy_trading', 'strategy_rules'], default: 'none' }) runtimeMode!: string;
  @Prop({ required: true, enum: ['draft', 'published', 'suspended', 'archived'], default: 'draft' }) status!: string;
  @Prop({ trim: true, default: '' }) notes!: string;
  @Prop({ type: SchemaTypes.ObjectId, default: null }) currentVersionId!: Types.ObjectId | null;
  @Prop({ type: String, trim: true, default: null }) currentVersion!: string | null;
  /** The provider sets pricing per platform — each platform is its own offer with its own file/version. */
  @Prop({ required: true, enum: ['one_time', 'subscription'], default: 'one_time' }) billingType!: 'one_time' | 'subscription';
  @Prop({ type: String, enum: ['month', 'year'], default: null }) billingInterval!: 'month' | 'year' | null;
  /** Minor units (cents) — never a float. */
  @Prop({ type: Number, min: 0, default: 0 }) priceAmount!: number;
  @Prop({ type: String, enum: ['USD'], default: 'USD' }) currency!: string;
  @Prop({ type: ProductPlatformDiscountSchema, default: null }) discount!: ProductPlatformDiscount | null;
}
const ProductPlatformSchema = SchemaFactory.createForClass(ProductPlatform);

@Schema({ collection: 'products', timestamps: true, versionKey: false })
export class Product {
  @Prop({ required: true, trim: true, index: true }) providerOrganizationId!: string;
  @Prop({ required: true, trim: true }) createdByGrapiflyUserId!: string;
  @Prop({ required: true, trim: true }) updatedByGrapiflyUserId!: string;
  @Prop({ type: SchemaTypes.ObjectId, ref: TypeProduct.name, required: true, index: true }) typeProductId!: Types.ObjectId;
  @Prop({ required: true, lowercase: true, trim: true }) key!: string;
  @Prop({ required: true, trim: true }) name!: string;
  @Prop({ trim: true, default: '' }) description!: string;
  @Prop({ type: [ProductPlatformSchema], default: [] }) platforms!: ProductPlatform[];
  @Prop({ required: true, enum: ['draft', 'pending_review', 'published', 'suspended', 'archived'], default: 'draft', index: true }) status!: ProductStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ providerOrganizationId: 1, key: 1 }, { unique: true });
ProductSchema.index({ providerOrganizationId: 1, status: 1, updatedAt: -1 });
ProductSchema.index({ 'platforms.platformId': 1, status: 1 });
