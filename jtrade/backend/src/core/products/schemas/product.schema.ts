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

/** One question + answer in the pre-purchase FAQ. Commercial content, not config. */
@Schema({ _id: false })
export class ProductFaqEntry {
  @Prop({ type: String, trim: true, default: '' }) question!: string;
  @Prop({ type: String, trim: true, default: '' }) answer!: string;
}
export const ProductFaqEntrySchema = SchemaFactory.createForClass(ProductFaqEntry);

/**
 * Everything a customer should understand about the product BEFORE buying.
 * Pure commercial content — Marketplace renders this as a product listing page.
 * This is NOT the future ProductVersion "Product Experience" (the technical
 * configuration UI); the two are deliberately separate.
 */
@Schema({ _id: false })
export class ProductPresentation {
  @Prop({ type: String, trim: true, default: '' }) fullDescription!: string;
  @Prop({ type: String, trim: true, default: '' }) whatItDoes!: string;
  @Prop({ type: String, trim: true, default: '' }) howItWorks!: string;
  @Prop({ type: String, trim: true, default: '' }) howToUse!: string;
  @Prop({ type: String, trim: true, default: '' }) whatYouReceive!: string;
  @Prop({ type: [String], default: [] }) features!: string[];
  @Prop({ type: [String], default: [] }) requirements!: string[];
  @Prop({ type: [String], default: [] }) limitations!: string[];
  @Prop({ type: [ProductFaqEntrySchema], default: [] }) faq!: ProductFaqEntry[];
  @Prop({ type: String, trim: true, default: '' }) documentationUrl!: string;
  @Prop({ type: String, trim: true, default: '' }) supportUrl!: string;
  @Prop({ type: String, trim: true, default: '' }) videoUrl!: string;
}
export const ProductPresentationSchema = SchemaFactory.createForClass(ProductPresentation);

/**
 * Auxiliary UX state for the commercial onboarding wizard. The source of truth
 * for "is this step done" is always the real data (see commercial-readiness.ts);
 * this only remembers where the provider was so they can resume.
 */
@Schema({ _id: false })
export class ProductOnboarding {
  @Prop({ type: Number, default: 1, min: 1, max: 9 }) currentStep!: number;
  @Prop({ type: [Number], default: [1] }) visitedSteps!: number[];
  @Prop({ type: Date, default: Date.now }) startedAt!: Date;
  @Prop({ type: Date, default: Date.now }) lastActiveAt!: Date;
  /** First moment the product became commercially ready. Never cleared. */
  @Prop({ type: Date, default: null }) completedAt!: Date | null;
}
export const ProductOnboardingSchema = SchemaFactory.createForClass(ProductOnboarding);

/**
 * PRODUCT = what is being sold: identity, presentation, classification, and its
 * commercial model (pricing/promotions live in the product-pricing module).
 *
 * PRODUCT VERSION = how a concrete release works technically (artifact, contract,
 * compatibility). That is a separate onboarding — not modelled here.
 *
 * `typeProductId` is required + immutable — chosen in Step 1 of onboarding
 * (Product Type). `platformIds` is the COMMERCIAL declaration of which trading
 * platforms the product runs on (Step 5, editable). `platformId` (singular) is
 * the deferred ProductVersion technical target — one concrete platform a release
 * is built for — and stays nullable/immutable-once-set. `indicatorIds` / `params`
 * / `native` are legacy technical fields the commercial wizard never touches.
 */
@Schema({ collection: 'products', timestamps: true, versionKey: false })
export class Product {
  @Prop({ required: true, trim: true, index: true }) providerOrganizationId!: string;
  @Prop({ required: true, trim: true }) createdByGrapiflyUserId!: string;
  @Prop({ required: true, trim: true }) updatedByGrapiflyUserId!: string;

  /**
   * The official product KIND. Chosen on the type-selection screen BEFORE
   * onboarding, required at creation, immutable afterwards (Signal -> Bot is a
   * different product). See core/type-products.
   */
  @Prop({ type: SchemaTypes.ObjectId, ref: TypeProduct.name, required: true, immutable: true, index: true }) typeProductId!: Types.ObjectId;
  /** Deferred to ProductVersion onboarding. Nullable. Immutable once set. */
  @Prop({ type: SchemaTypes.ObjectId, ref: Platform.name, default: null, index: true }) platformId!: Types.ObjectId | null;
  /**
   * Commercial: every trading platform this product operates on (MT4, MT5, …).
   * Chosen in Step 5 of onboarding, editable afterwards (a provider can add
   * platform support later). Must contain at least one for commercial readiness.
   */
  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: Platform.name }], default: [], index: true }) platformIds!: Types.ObjectId[];

  @Prop({ required: true, lowercase: true, trim: true }) key!: string;
  @Prop({ required: true, trim: true }) name!: string;
  @Prop({ trim: true, default: '' }) description!: string;

  // ── Identity (commercial) ──────────────────────────────────────────────────
  @Prop({ type: String, trim: true, default: '' }) tagline!: string;
  @Prop({ type: String, trim: true, default: '' }) shortDescription!: string;
  @Prop({ type: String, trim: true, default: '' }) logoUrl!: string;
  @Prop({ type: String, trim: true, default: '' }) coverImageUrl!: string;

  // ── Presentation (commercial) ──────────────────────────────────────────────
  @Prop({ type: ProductPresentationSchema, default: () => ({}) }) presentation!: ProductPresentation;

  // ── Classification (declaration only — no type-specific logic here) ─────────
  @Prop({ type: String, trim: true, lowercase: true, default: '' }) category!: string;
  @Prop({ type: [String], default: [] }) tags!: string[];

  // ── Commercial onboarding UX state ─────────────────────────────────────────
  @Prop({ type: ProductOnboardingSchema, default: () => ({}) }) onboarding!: ProductOnboarding;

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
ProductSchema.index({ platformIds: 1, status: 1 });
ProductSchema.index({ category: 1, status: 1 });
