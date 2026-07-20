import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type IndicatorProjectDocument = HydratedDocument<IndicatorProject>;

@Schema({
  timestamps: true,
  collection: 'indicator_projects',
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class IndicatorProject {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'CompanyProvider',
    required: true,
    index: true,
  })
  companyProviderId!: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'ProjectCodePlatform',
    required: true,
    index: true,
  })
  projectCodePlatformId!: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Indicator',
    required: true,
    index: true,
  })
  indicatorId!: Types.ObjectId;

  @Prop({
    type: Boolean,
    default: true,
    index: true,
  })
  isActive!: boolean;

  @Prop({
    type: String,
    trim: true,
    default: '',
  })
  notes?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const IndicatorProjectSchema =
  SchemaFactory.createForClass(IndicatorProject);

IndicatorProjectSchema.index(
  { companyProviderId: 1, projectCodePlatformId: 1, indicatorId: 1 },
  {
    unique: true,
    name: 'uniq_company_project_platform_indicator',
  },
);

IndicatorProjectSchema.index({ companyProviderId: 1, isActive: 1 });
IndicatorProjectSchema.index({ projectCodePlatformId: 1, isActive: 1 });
IndicatorProjectSchema.index({ indicatorId: 1, isActive: 1 });

IndicatorProjectSchema.virtual('companyProvider', {
  ref: 'CompanyProvider',
  localField: 'companyProviderId',
  foreignField: '_id',
  justOne: true,
});

IndicatorProjectSchema.virtual('projectCodePlatform', {
  ref: 'ProjectCodePlatform',
  localField: 'projectCodePlatformId',
  foreignField: '_id',
  justOne: true,
});

IndicatorProjectSchema.virtual('indicator', {
  ref: 'Indicator',
  localField: 'indicatorId',
  foreignField: '_id',
  justOne: true,
});
