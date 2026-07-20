import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ChannelToUseType = 'email' | 'sms';

export type DomainCatalogueDocument = HydratedDocument<DomainCatalogue> & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ _id: false })
export class ChannelToUse {
  @Prop({ required: true, enum: ['email', 'sms'] })
  channel!: ChannelToUseType;

  @Prop({ type: Types.ObjectId, ref: 'ProviderCredentials', required: true })
  providerCredentialsId!: Types.ObjectId;
}

export const ChannelToUseSchema = SchemaFactory.createForClass(ChannelToUse);

@Schema({
  collection: 'domain_catalogues',
  versionKey: false,
  timestamps: true,
})
export class DomainCatalogue {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  domainKey!: string;

  @Prop({ required: true, trim: true })
  displayName!: string;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  domainCategory!: string;

  @Prop({ default: true, index: true })
  isActive!: boolean;

  /** System domains are created by platform provisioning and cannot be deleted. */
  @Prop({ default: false, index: true })
  isSystem!: boolean;

  @Prop({ type: [ChannelToUseSchema], default: [] })
  channelsToUse!: ChannelToUse[];
}

export const DomainCatalogueSchema =
  SchemaFactory.createForClass(DomainCatalogue);

DomainCatalogueSchema.index(
  { companyId: 1, domainKey: 1 },
  { unique: true, name: 'uniq_company_domainKey' },
);
