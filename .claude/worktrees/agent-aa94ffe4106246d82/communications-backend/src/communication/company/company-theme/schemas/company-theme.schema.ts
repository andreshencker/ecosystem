// src/company-theme/schemas/company-theme.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Company } from '../../company-info/schemas/company.schema';

export type CompanyThemeDocument = HydratedDocument<CompanyTheme>;

@Schema({
  collection: 'company_themes',
  versionKey: false,
  timestamps: true,
})
export class CompanyTheme {
  @Prop({
    type: Types.ObjectId,
    ref: Company.name,
    required: true,
    index: true,
  })
  companyId!: Types.ObjectId;
  @Prop({ type: String, required: true }) label!: string;
  // 🎨 Colors
  @Prop({ type: String, required: true }) primaryColor!: string;
  @Prop({ type: String, required: true }) secondaryColor!: string;
  @Prop({ type: String, required: true }) backgroundColor!: string;
  @Prop({ type: String, required: true }) surfaceColor!: string;
  @Prop({ type: String, required: true }) textColor!: string;
  @Prop({ type: String, required: true }) mutedTextColor!: string;
  @Prop({ type: String, required: true }) borderColor!: string;
  @Prop({ type: String, required: true }) linkColor!: string;

  // 🅰️ Typography
  @Prop({ type: String, required: true }) fontFamily!: string;
  @Prop({ type: String, required: true }) fontSizeBase!: string;
  @Prop({ type: Number, required: true }) fontWeightNormal!: number;
  @Prop({ type: Number, required: true }) fontWeightBold!: number;

  // Flags
  @Prop({ type: Boolean, default: false, index: true }) isDefault!: boolean;
  @Prop({ type: Boolean, default: true, index: true }) isActive!: boolean;
}

export const CompanyThemeSchema = SchemaFactory.createForClass(CompanyTheme);

// Consultas comunes
CompanyThemeSchema.index({ companyId: 1, isActive: 1 });

// ✅ Regla: SOLO 1 default por company (solo aplica cuando isDefault=true)
CompanyThemeSchema.index(
  { companyId: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } },
);
