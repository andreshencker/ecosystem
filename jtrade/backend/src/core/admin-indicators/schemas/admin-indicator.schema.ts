import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

import { IndicatorProject } from '../../indicator-projects/schemas/indicator-project.schema';

export type AdminIndicatorDocument = HydratedDocument<AdminIndicator>;

@Schema({
  timestamps: true,
  collection: 'admin_indicators',
})
export class AdminIndicator {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: IndicatorProject.name,
    required: true,
    unique: true,
    index: true,
  })
  indicatorProjectId!: Types.ObjectId;

  @Prop({ type: String, required: true, unique: true, index: true })
  webhookKey!: string;

  @Prop({ type: String, required: true, select: false })
  webhookSecretEnc!: string;

  @Prop({ type: String, required: true, select: false })
  webhookSecretIv!: string;

  @Prop({ type: String, required: true, select: false })
  webhookSecretTag!: string;

  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AdminIndicatorSchema =
  SchemaFactory.createForClass(AdminIndicator);

AdminIndicatorSchema.index(
  { indicatorProjectId: 1 },
  { unique: true, name: 'uniq_admin_indicator_project' },
);
