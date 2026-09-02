import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TypeProductDocument = HydratedDocument<TypeProduct>;

@Schema({
  collection: 'type_products',
  timestamps: true,
  versionKey: false,
})
export class TypeProduct {
  @Prop({
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  })
  key!: string;

  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    trim: true,
    default: '',
  })
  description?: string;

  @Prop({
    type: Boolean,
    default: true,
    index: true,
  })
  isActive!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const TypeProductSchema = SchemaFactory.createForClass(TypeProduct);

TypeProductSchema.index({ isActive: 1, name: 1 });
