import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { TypeProduct } from '../../type-products/schemas/type-product.schema';
import { Platform } from '../../platforms/schemas/platform.schema';

export type ProductDocument = HydratedDocument<Product>;
export type ProductStatus = 'draft' | 'pending_review' | 'published' | 'suspended' | 'archived';

export const PRODUCT_PARAM_TYPES = ['number', 'boolean', 'string', 'list'] as const;
export type ProductParamType = (typeof PRODUCT_PARAM_TYPES)[number];

/** How often the client fills a param. jtrade only needs to know this. */
export const PRODUCT_PARAM_REPEAT = ['once', 'per-symbol'] as const;
export type ProductParamRepeat = (typeof PRODUCT_PARAM_REPEAT)[number];

/**
 * One parameter the provider's code needs. The provider declares these; when a
 * client buys the product jtrade renders them as a form. jtrade never interprets
 * the values — it only stores and forwards them.
 */
@Schema({ _id: false })
export class ProductParam {
  /** The exact name the code reads, e.g. `riskPercent`. */
  @Prop({ required: true, trim: true }) key!: string;
  /** What the client sees in the form. */
  @Prop({ required: true, trim: true }) label!: string;
  @Prop({ required: true, enum: PRODUCT_PARAM_TYPES }) type!: ProductParamType;
  @Prop({ type: SchemaTypes.Mixed, default: null }) defaultValue!: unknown;
  @Prop({ type: Boolean, default: false }) required!: boolean;
  /** `once` = one value per account. `per-symbol` = one value per alert (symbol + timeframe). */
  @Prop({ type: String, enum: PRODUCT_PARAM_REPEAT, default: 'per-symbol' }) repeat!: ProductParamRepeat;
  /** Free-text section label — cosmetic, the provider names it however they want. */
  @Prop({ type: String, trim: true, default: '' }) group!: string;
  /** number only */
  @Prop({ type: Number, default: null }) min!: number | null;
  @Prop({ type: Number, default: null }) max!: number | null;
  /** list only */
  @Prop({ type: [String], default: [] }) options!: string[];
}
export const ProductParamSchema = SchemaFactory.createForClass(ProductParam);

/**
 * One product = one type + one platform. Different platform (or a different
 * indicator set) means a different product — this keeps versioning linear and
 * pricing traceable.
 *
 * Money lives in the product-pricing module (product_prices / product_promotions).
 * Version history lives in product_versions (isCurrentVersion flag there).
 */
@Schema({ collection: 'products', timestamps: true, versionKey: false })
export class Product {
  @Prop({ required: true, trim: true, index: true }) providerOrganizationId!: string;
  @Prop({ required: true, trim: true }) createdByGrapiflyUserId!: string;
  @Prop({ required: true, trim: true }) updatedByGrapiflyUserId!: string;

  /** Immutable after creation. */
  @Prop({ type: SchemaTypes.ObjectId, ref: TypeProduct.name, required: true, index: true }) typeProductId!: Types.ObjectId;
  /** Immutable after creation. */
  @Prop({ type: SchemaTypes.ObjectId, ref: Platform.name, required: true, index: true }) platformId!: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true }) key!: string;
  @Prop({ required: true, trim: true }) name!: string;
  @Prop({ trim: true, default: '' }) description!: string;

  @Prop({ required: true, enum: ['draft', 'pending_review', 'published', 'suspended', 'archived'], default: 'draft', index: true }) status!: ProductStatus;

  /** true = first-party product built by Grapifly. Runtime uses the opinionated path. */
  @Prop({ type: Boolean, default: false }) native!: boolean;

  /**
   * Only meaningful when the product type is 'signals'. Each id references an
   * Indicator in the same org. The TradingView webhook lives on the Indicator,
   * not here — the product is the sell + platform + execution layer.
   */
  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: 'Indicator' }], default: [] }) indicatorIds!: Types.ObjectId[];

  /** Parameters the provider's code needs. Client fills them at purchase time. */
  @Prop({ type: [ProductParamSchema], default: [] }) params!: ProductParam[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ providerOrganizationId: 1, key: 1 }, { unique: true });
ProductSchema.index({ providerOrganizationId: 1, status: 1, updatedAt: -1 });
ProductSchema.index({ platformId: 1, status: 1 });
