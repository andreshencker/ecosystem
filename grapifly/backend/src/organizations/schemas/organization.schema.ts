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

  @Prop({ required: true, enum: ['company', 'individual'], default: 'company', index: true })
  entityType!: 'company' | 'individual';

  @Prop({ type: String, default: '' })
  legalName!: string;

  @Prop({ type: String, default: '' })
  tagline!: string;

  @Prop({ type: String, default: 'Australia/Sydney' })
  timezone!: string;

  @Prop({ type: String, default: '', lowercase: true, trim: true })
  officialEmail!: string;

  @Prop({ type: String, default: '', lowercase: true, trim: true })
  supportEmail!: string;

  @Prop({ type: String, default: '' })
  supportPhone!: string;

  @Prop({ type: String, default: '' })
  supportPhoneCountryCode!: string;

  @Prop({ type: String, default: '' })
  supportPhoneNumber!: string;

  @Prop({ type: String, default: '' })
  supportHours!: string;

  @Prop({ type: String, default: '' })
  addressLine1!: string;

  @Prop({ type: String, default: '' })
  addressLine2!: string;

  @Prop({ type: String, default: '' })
  addressCity!: string;

  @Prop({ type: String, default: '' })
  addressState!: string;

  @Prop({ type: String, default: '' })
  addressPostalCode!: string;

  @Prop({ type: String, default: '' })
  addressCountry!: string;

  @Prop({ type: String, default: '' })
  websiteUrl!: string;

  @Prop({ type: String, default: '' })
  apiBaseUrl!: string;

  @Prop({ type: String, default: '' })
  helpCenterUrl!: string;

  @Prop({ type: String, default: '' })
  privacyPolicyUrl!: string;

  @Prop({ type: String, default: '' })
  termsUrl!: string;

  @Prop({ type: String, default: '' })
  unsubscribeUrl!: string;

  @Prop({ type: String, default: '' })
  facebook!: string;

  @Prop({ type: String, default: '' })
  instagram!: string;

  @Prop({ type: String, default: '' })
  linkedin!: string;

  @Prop({ type: String, default: '' })
  x!: string;

  @Prop({ type: String, default: '' })
  youtube!: string;

  @Prop({ type: String, default: '' })
  tiktok!: string;

  @Prop({ type: String, default: '' })
  whatsapp!: string;

  @Prop({ type: String, default: '' })
  telegram!: string;

  @Prop({ type: String, default: '' })
  copyrightText!: string;

  @Prop({ type: String, default: '' })
  disclaimerShort!: string;

  @Prop({ type: String, default: '' })
  disclaimerLong!: string;

  @Prop({ type: String, default: '' })
  logoIconUrl!: string;

  @Prop({ type: String, default: '' })
  logoFullUrl!: string;

  @Prop({ type: Boolean, default: false })
  isPlatform!: boolean;

  @Prop({ type: Boolean, default: false, index: true })
  isDefault!: boolean;

  @Prop({ required: true, enum: ['active', 'suspended', 'archived'], default: 'active', index: true })
  status!: 'active' | 'suspended' | 'archived';
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
OrganizationSchema.index({ isPlatform: 1 }, { unique: true, partialFilterExpression: { isPlatform: true } });
OrganizationSchema.index({ createdBy: 1, isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } });
