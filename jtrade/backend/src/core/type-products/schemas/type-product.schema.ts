import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TypeProductDocument = HydratedDocument<TypeProduct>;

/**
 * Official catalogue of product KINDS in JTrade (Bot, Signal, ...). Managed
 * exclusively by ADMIN. A provider only picks one active type — it cannot
 * create or edit types.
 *
 * A type answers "what KIND of product is being created", nothing more. It does
 * NOT hold technical configuration, contract fields, params, runtime behaviour
 * or capabilities — those belong to a later ProductVersion design.
 */
@Schema({
  collection: 'type_products',
  timestamps: true,
  versionKey: false,
})
export class TypeProduct {
  /** Stable machine identifier. Immutable once created. Identification only — no business logic keys off this. */
  @Prop({ required: true, unique: true, trim: true, lowercase: true, index: true, immutable: true })
  key!: string;

  /** Official display name, e.g. "Signal". */
  @Prop({ required: true, trim: true })
  name!: string;

  /** One short line for the selection card. */
  @Prop({ type: String, trim: true, default: '' })
  shortDescription!: string;

  /** Full explanation of what this kind of product is, shown to the provider before they choose. */
  @Prop({ type: String, trim: true, default: '' })
  description!: string;

  /** Official visual for the type (Relay-stored URL or an external URL). */
  @Prop({ type: String, trim: true, default: '' })
  iconUrl!: string;

  /** Whether providers can create NEW products of this type. Inactive types keep working for existing products. */
  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;

  /** Ascending sort order in the provider's type-selection screen. */
  @Prop({ type: Number, default: 0, index: true })
  displayOrder!: number;

  @Prop({ type: String, trim: true, default: '' })
  createdByGrapiflyUserId!: string;

  @Prop({ type: String, trim: true, default: '' })
  updatedByGrapiflyUserId!: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const TypeProductSchema = SchemaFactory.createForClass(TypeProduct);

TypeProductSchema.index({ isActive: 1, displayOrder: 1, name: 1 });
