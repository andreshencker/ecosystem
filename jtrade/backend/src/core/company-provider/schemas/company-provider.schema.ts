import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type CompanyProviderDocument = HydratedDocument<CompanyProvider>;

export enum CompanyProviderStatus {
  Pending = 'pending',
  Active = 'active',
  Suspended = 'suspended',
  Rejected = 'rejected',
}

@Schema({
  timestamps: true,
  collection: 'company_providers',
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CompanyProvider {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  })
  ownerUserId!: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
    index: true,
  })
  companyName!: string;

  @Prop({
    trim: true,
    default: '',
  })
  legalName?: string;

  @Prop({
    trim: true,
    lowercase: true,
    default: '',
  })
  email?: string;

  @Prop({
    trim: true,
    default: '',
  })
  phone?: string;

  @Prop({
    trim: true,
    default: '',
  })
  website?: string;

  @Prop({
    trim: true,
    default: '',
  })
  logoUrl?: string;

  @Prop({
    trim: true,
    default: '',
  })
  description?: string;

  @Prop({
    type: String,
    enum: Object.values(CompanyProviderStatus),
    default: CompanyProviderStatus.Pending,
    index: true,
  })
  status!: CompanyProviderStatus;

  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  isVerified!: boolean;

  @Prop({
    type: Boolean,
    default: true,
    index: true,
  })
  isActive!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CompanyProviderSchema =
  SchemaFactory.createForClass(CompanyProvider);

CompanyProviderSchema.index({
  status: 1,
  isActive: 1,
});

CompanyProviderSchema.virtual('owner', {
  ref: 'User',
  localField: 'ownerUserId',
  foreignField: '_id',
  justOne: true,
});
