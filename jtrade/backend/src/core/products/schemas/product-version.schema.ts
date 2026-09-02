import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { Product } from './product.schema';

export type ProductVersionDocument = HydratedDocument<ProductVersion>;

/** A product is bound to one platform, so a version only needs the productId. */
@Schema({ collection: 'product_versions', timestamps: true, versionKey: false })
export class ProductVersion {
  @Prop({ required: true, trim: true, index: true }) providerOrganizationId!: string;
  @Prop({ type: SchemaTypes.ObjectId, ref: Product.name, required: true, index: true }) productId!: Types.ObjectId;
  @Prop({ required: true, trim: true }) version!: string;
  @Prop({ required: true, trim: true }) fileName!: string;
  @Prop({ trim: true, default: '' }) originalFileName!: string;
  @Prop({ required: true, lowercase: true, trim: true }) extension!: string;
  @Prop({ required: true, trim: true }) fileKey!: string;
  @Prop({ type: Number, min: 0, default: 0 }) size!: number;
  @Prop({ trim: true, default: 'application/octet-stream' }) contentType!: string;
  @Prop({ trim: true, default: '' }) releaseNotes!: string;
  @Prop({ required: true, enum: ['draft', 'published', 'deprecated'], default: 'draft', index: true }) status!: string;
  @Prop({ type: Boolean, default: false, index: true }) isCurrentVersion!: boolean;
  @Prop({ required: true, trim: true }) createdByGrapiflyUserId!: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const ProductVersionSchema = SchemaFactory.createForClass(ProductVersion);
ProductVersionSchema.index({ productId: 1, version: 1 }, { unique: true });
ProductVersionSchema.index({ providerOrganizationId: 1, productId: 1, createdAt: -1 });
ProductVersionSchema.index(
  { productId: 1, isCurrentVersion: 1 },
  { unique: true, partialFilterExpression: { isCurrentVersion: true } },
);
