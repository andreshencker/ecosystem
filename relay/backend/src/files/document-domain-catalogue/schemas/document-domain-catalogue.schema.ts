import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DocumentFormat = 'pdf' | 'xlsx' | 'csv' | 'html';
export const SUPPORTED_DOCUMENT_FORMATS: DocumentFormat[] = [
  'pdf',
  'xlsx',
  'csv',
  'html',
];

export type DocumentDomainCatalogueDocument =
  HydratedDocument<DocumentDomainCatalogue> & {
    createdAt: Date;
    updatedAt: Date;
  };

@Schema({
  collection: 'document_domain_catalogues',
  versionKey: false,
  timestamps: true,
})
export class DocumentDomainCatalogue {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  domainKey!: string;

  @Prop({ required: true, trim: true })
  displayName!: string;

  @Prop({ default: '', trim: true })
  description!: string;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  domainCategory!: string;

  /** Formats permitted for documents in this domain — e.g. ['pdf', 'xlsx'] */
  @Prop({ type: [String], enum: ['pdf', 'xlsx', 'csv', 'html'], default: [] })
  allowedFormats!: DocumentFormat[];

  @Prop({ default: true, index: true })
  isActive!: boolean;

  /** System domains cannot be deleted. */
  @Prop({ default: false, index: true })
  isSystem!: boolean;
}

export const DocumentDomainCatalogueSchema = SchemaFactory.createForClass(
  DocumentDomainCatalogue,
);

DocumentDomainCatalogueSchema.index(
  { companyId: 1, domainKey: 1 },
  { unique: true, name: 'uniq_company_documentDomainKey' },
);
