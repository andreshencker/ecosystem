import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type IndicatorDocument = HydratedDocument<Indicator>;

@Schema({
  timestamps: true,
  collection: 'indicators',
})
export class Indicator {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'CompanyProvider',
    required: true,
    index: true,
  })
  companyProviderId!: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    required: true,
    trim: true,
    lowercase: true,
  })
  key!: string;

  @Prop({
    trim: true,
    default: '',
  })
  description?: string;

  @Prop({
    default: true,
    index: true,
  })
  isActive!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const IndicatorSchema = SchemaFactory.createForClass(Indicator);

IndicatorSchema.index({ companyProviderId: 1, key: 1 }, { unique: true });

IndicatorSchema.index({ companyProviderId: 1, name: 1 }, { unique: true });

IndicatorSchema.index({ companyProviderId: 1, isActive: 1, name: 1 });
