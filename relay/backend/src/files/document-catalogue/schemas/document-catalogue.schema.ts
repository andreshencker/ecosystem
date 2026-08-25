import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { DocumentDomainCatalogue } from '../../document-domain-catalogue/schemas/document-domain-catalogue.schema';
import { FIELD_TYPES } from '../../generator/types/field-definition.types';

export type DocumentCatalogueDocument = HydratedDocument<DocumentCatalogue> & {
  createdAt: Date;
  updatedAt: Date;
};

// ─── Shared: typed field definition ──────────────────────────────────────────
//
// Used inside every format's section / worksheet / column list to declare:
//   - the data key to read at runtime
//   - the expected type and format
//   - required / optional constraint
//
// All properties have defaults so pre-existing contracts without field defs
// continue to load without errors.

@Schema({ _id: false })
export class ContractFieldDefinition {
  @Prop({ type: String, default: '' }) key!: string;
  @Prop({ type: String, default: '' }) label!: string;
  @Prop({ type: String, default: 'string', enum: FIELD_TYPES }) type!: string;
  @Prop({ type: Boolean, default: false }) required!: boolean;
  /** Formatting hint: 'currency', 'percentage', 'YYYY-MM-DD', '#,##0.00', etc. */
  @Prop({ type: String, default: '' }) format!: string;
  @Prop({ type: Number, default: null }) minimum!: number | null;
  @Prop({ type: Number, default: null }) maximum!: number | null;
  @Prop({ type: [String], default: [] }) allowedValues!: string[];
  @Prop({ type: String, default: null }) defaultValue!: string | null;
}
export const ContractFieldDefinitionSchema = SchemaFactory.createForClass(
  ContractFieldDefinition,
);

// ─── PDF Contract ─────────────────────────────────────────────────────────────

/**
 * Declares one section of a PDF document.
 *
 * NEW (v2) fields:
 *   dataPath  — dot-path into runtime `data` (e.g. "invoice.lineItems")
 *   dataType  — 'array' | 'object' | 'value'
 *   fields    — typed field definitions for html / summary / totals / notes sections
 *   columns   — typed column definitions for table sections
 *
 * Legacy fields (key, type, label, enabled) remain fully supported.
 */
@Schema({ _id: false })
export class PdfSectionConfig {
  @Prop({ type: String, default: '' }) key!: string;
  @Prop({
    type: String,
    default: '',
    enum: ['html', 'summary', 'table', 'totals', 'notes', ''],
  })
  type!: string;
  @Prop({ type: String, default: '' }) label!: string;
  @Prop({ type: Boolean, default: true }) enabled!: boolean;

  // v2 additions — all optional with safe defaults
  @Prop({ type: String, default: '' }) dataPath!: string;
  @Prop({ type: String, default: 'array', enum: ['array', 'object', 'value'] })
  dataType!: string;
  /** Field definitions for html / summary / totals / notes (non-table) sections */
  @Prop({ type: [ContractFieldDefinitionSchema], default: [] })
  fields!: ContractFieldDefinition[];
  /** Column definitions for table sections */
  @Prop({ type: [ContractFieldDefinitionSchema], default: [] })
  columns!: ContractFieldDefinition[];
}
export const PdfSectionConfigSchema =
  SchemaFactory.createForClass(PdfSectionConfig);

@Schema({ _id: false })
export class PdfFormatContract {
  @Prop({ type: Boolean, default: true }) enabled!: boolean;
  @Prop({ type: String, default: '1.0' }) version!: string;
  @Prop({ type: String, default: 'pdf', enum: ['pdf'] }) renderer!: string;
  @Prop({ type: String, default: 'pdf', enum: ['pdf'] }) layoutType!: string;
  @Prop({ type: String, default: '' }) layoutKey!: string;
  @Prop({ type: [PdfSectionConfigSchema], default: [] })
  sections!: PdfSectionConfig[];
  /** Legacy flat fields list — kept for backward compatibility. */
  @Prop({ type: [String], default: [] }) requiredFields!: string[];
  @Prop({ type: [String], default: [] }) optionalFields!: string[];
  @Prop({ type: String, default: '' }) notes!: string;
}
export const PdfFormatContractSchema =
  SchemaFactory.createForClass(PdfFormatContract);

// ─── XLSX Worksheet Column ─────────────────────────────────────────────────────

/**
 * NEW (v2) additions to XlsxColumnConfig:
 *   type     — FieldType for runtime validation
 *   required — whether the value is required in every row
 *   format   — formatting hint (e.g. 'currency', 'date')
 *
 * Legacy isNumeric kept — the renderer uses it for numeric cell formatting.
 */
@Schema({ _id: false })
export class XlsxColumnConfig {
  @Prop({ type: String, default: '' }) key!: string;
  @Prop({ type: String, default: '' }) label!: string;
  /** Legacy: renderer uses this to apply #,##0.00 formatting to numeric cells. */
  @Prop({ type: Boolean, default: false }) isNumeric!: boolean;

  // v2 additions
  @Prop({ type: String, default: 'string', enum: FIELD_TYPES }) type!: string;
  @Prop({ type: Boolean, default: false }) required!: boolean;
  @Prop({ type: String, default: '' }) format!: string;
  @Prop({ type: Number, default: null }) minimum!: number | null;
  @Prop({ type: Number, default: null }) maximum!: number | null;
}
export const XlsxColumnConfigSchema =
  SchemaFactory.createForClass(XlsxColumnConfig);

/**
 * NEW (v2): dataPath preferred over legacy dataSource.
 * Both are stored; resolution prefers dataPath when non-empty.
 */
@Schema({ _id: false })
export class XlsxWorksheetConfig {
  @Prop({ type: String, default: '' }) key!: string;
  @Prop({ type: String, default: '' }) label!: string;
  /** Legacy: dot-path or logical name for the data source. */
  @Prop({ type: String, default: '' }) dataSource!: string;
  /** v2: dot-path into runtime data (e.g. "invoice.lineItems"). Preferred over dataSource. */
  @Prop({ type: String, default: '' }) dataPath!: string;
  @Prop({ type: [XlsxColumnConfigSchema], default: [] })
  columns!: XlsxColumnConfig[];
}
export const XlsxWorksheetConfigSchema =
  SchemaFactory.createForClass(XlsxWorksheetConfig);

@Schema({ _id: false })
export class XlsxFormatContract {
  @Prop({ type: Boolean, default: true }) enabled!: boolean;
  @Prop({ type: String, default: '1.0' }) version!: string;
  @Prop({ type: String, default: 'xlsx', enum: ['xlsx'] }) renderer!: string;
  @Prop({ type: [XlsxWorksheetConfigSchema], default: [] })
  worksheets!: XlsxWorksheetConfig[];
  @Prop({ type: [String], default: [] }) requiredFields!: string[];
  @Prop({ type: [String], default: [] }) optionalFields!: string[];
  @Prop({ type: String, default: '' }) notes!: string;
}
export const XlsxFormatContractSchema =
  SchemaFactory.createForClass(XlsxFormatContract);

// ─── CSV Column ────────────────────────────────────────────────────────────────

/**
 * NEW (v2) additions: type, required, format.
 */
@Schema({ _id: false })
export class CsvColumnConfig {
  @Prop({ type: String, default: '' }) key!: string;
  @Prop({ type: String, default: '' }) label!: string;

  // v2 additions
  @Prop({ type: String, default: 'string', enum: FIELD_TYPES }) type!: string;
  @Prop({ type: Boolean, default: false }) required!: boolean;
  @Prop({ type: String, default: '' }) format!: string;
}
export const CsvColumnConfigSchema =
  SchemaFactory.createForClass(CsvColumnConfig);

/**
 * NEW (v2): dataPath preferred over legacy dataSource.
 */
@Schema({ _id: false })
export class CsvFormatContract {
  @Prop({ type: Boolean, default: true }) enabled!: boolean;
  @Prop({ type: String, default: '1.0' }) version!: string;
  @Prop({ type: String, default: 'csv', enum: ['csv'] }) renderer!: string;
  /** Legacy: logical name for the data source. */
  @Prop({ type: String, default: '' }) dataSource!: string;
  /** v2: dot-path into runtime data (e.g. "invoice.lineItems"). Preferred over dataSource. */
  @Prop({ type: String, default: '' }) dataPath!: string;
  @Prop({ type: Boolean, default: true }) includeHeaders!: boolean;
  @Prop({ type: [CsvColumnConfigSchema], default: [] })
  columns!: CsvColumnConfig[];
  @Prop({ type: [String], default: [] }) requiredFields!: string[];
  @Prop({ type: [String], default: [] }) optionalFields!: string[];
  @Prop({ type: String, default: '' }) notes!: string;
}
export const CsvFormatContractSchema =
  SchemaFactory.createForClass(CsvFormatContract);

// ─── Format Contracts Container ───────────────────────────────────────────────

@Schema({ _id: false })
export class DocumentFormatContracts {
  @Prop({ type: PdfFormatContractSchema, required: false })
  pdf?: PdfFormatContract;
  @Prop({ type: XlsxFormatContractSchema, required: false })
  xlsx?: XlsxFormatContract;
  @Prop({ type: CsvFormatContractSchema, required: false })
  csv?: CsvFormatContract;
}
export const DocumentFormatContractsSchema = SchemaFactory.createForClass(
  DocumentFormatContracts,
);

// ─── Document Catalogue ───────────────────────────────────────────────────────

@Schema({
  collection: 'document_catalogues',
  versionKey: false,
  timestamps: true,
})
export class DocumentCatalogue {
  @Prop({
    type: Types.ObjectId,
    ref: DocumentDomainCatalogue.name,
    required: true,
    index: true,
  })
  documentDomainCatalogueId!: Types.ObjectId;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  documentKey!: string;

  @Prop({ required: true, trim: true })
  displayName!: string;

  @Prop({ default: '', trim: true })
  description!: string;

  @Prop({ type: DocumentFormatContractsSchema, default: () => ({}) })
  formatContracts!: DocumentFormatContracts;

  @Prop({ default: true, index: true })
  isActive!: boolean;
}

export const DocumentCatalogueSchema =
  SchemaFactory.createForClass(DocumentCatalogue);

DocumentCatalogueSchema.index(
  { documentDomainCatalogueId: 1, documentKey: 1 },
  { unique: true, name: 'uniq_documentDomain_documentKey' },
);
