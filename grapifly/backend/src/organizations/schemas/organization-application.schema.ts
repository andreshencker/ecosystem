import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrganizationApplicationDocument = HydratedDocument<OrganizationApplication>;

@Schema({ collection: 'organization_applications', timestamps: true, versionKey: false })
export class OrganizationApplication {
  @Prop({ required: true, index: true })
  organizationId!: string;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  applicationKey!: string;

  @Prop({ required: true, enum: ['active', 'suspended'], default: 'active' })
  status!: 'active' | 'suspended';

  @Prop({ required: true })
  enabledBy!: string;
}

export const OrganizationApplicationSchema = SchemaFactory.createForClass(OrganizationApplication);
OrganizationApplicationSchema.index({ organizationId: 1, applicationKey: 1 }, { unique: true });
