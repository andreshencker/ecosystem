import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type StorageDomainCatalogueDocument =
  HydratedDocument<StorageDomainCatalogue> & {
    createdAt: Date;
    updatedAt: Date;
  };

/** Each domain is the top-level folder name a tenant's storage uploads land under. */
@Schema({
  collection: 'storage_domain_catalogues',
  versionKey: false,
  timestamps: true,
})
export class StorageDomainCatalogue {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  /** Which storage credential (bucket/provider) this domain's files are written to. */
  @Prop({ type: Types.ObjectId, ref: 'ProviderCredentials', required: true, index: true })
  providerCredentialsId!: Types.ObjectId;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  domainKey!: string;

  @Prop({ required: true, trim: true })
  displayName!: string;

  @Prop({ default: '', trim: true })
  description!: string;

  @Prop({ default: true, index: true })
  isActive!: boolean;

  /** System domains cannot be deleted. */
  @Prop({ default: false, index: true })
  isSystem!: boolean;
}

export const StorageDomainCatalogueSchema = SchemaFactory.createForClass(
  StorageDomainCatalogue,
);

StorageDomainCatalogueSchema.index(
  { companyId: 1, domainKey: 1 },
  { unique: true, name: 'uniq_company_storageDomainKey' },
);
