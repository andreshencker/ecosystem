import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TypeProjectDocument = HydratedDocument<TypeProject>;

@Schema({
  collection: 'type_projects',
  timestamps: true,
  versionKey: false,
})
export class TypeProject {
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

export const TypeProjectSchema = SchemaFactory.createForClass(TypeProject);

TypeProjectSchema.index({ isActive: 1, name: 1 });
