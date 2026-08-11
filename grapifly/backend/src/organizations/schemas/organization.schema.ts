import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrganizationDocument = HydratedDocument<Organization>;

@Schema({ collection: 'organizations', timestamps: true, versionKey: false })
export class Organization {
  @Prop({ required: true, unique: true, index: true })
  organizationId!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, lowercase: true, trim: true, unique: true, index: true })
  slug!: string;

  @Prop({ required: true, index: true })
  createdBy!: string;

  @Prop({ required: true, enum: ['active', 'suspended'], default: 'active', index: true })
  status!: 'active' | 'suspended';
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
