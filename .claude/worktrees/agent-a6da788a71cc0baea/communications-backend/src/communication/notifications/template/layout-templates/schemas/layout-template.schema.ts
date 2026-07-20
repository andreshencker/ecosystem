// src/layout-templates/schemas/layout-template.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TemplateType = 'email' | 'pdf';

export type LayoutTemplateDocument = HydratedDocument<LayoutTemplate>;

@Schema({ collection: 'layout_templates', versionKey: false, timestamps: true })
export class LayoutTemplate {
  // ✅ fuente de verdad: layout pertenece a un theme (y el theme pertenece a una company)
  @Prop({
    type: Types.ObjectId,
    ref: 'CompanyTheme',
    required: true,
    index: true,
  })
  companyThemeId!: Types.ObjectId;

  @Prop({ required: true, enum: ['email', 'pdf'], index: true })
  templateType!: TemplateType;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  key!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true })
  html!: string;

  @Prop({ default: '' })
  css!: string;

  @Prop({ type: [String], default: [] })
  requiredVariables!: string[];

  @Prop({ type: [String], default: [] })
  optionalVariables!: string[];

  @Prop({ default: false, index: true })
  isDefault!: boolean;

  @Prop({ default: true, index: true })
  isActive!: boolean;
}

export const LayoutTemplateSchema =
  SchemaFactory.createForClass(LayoutTemplate);

// ✅ Evitar duplicados por theme + templateType + key
LayoutTemplateSchema.index(
  { companyThemeId: 1, templateType: 1, key: 1 },
  { unique: true, name: 'uniq_theme_type_key' },
);

// ✅ Solo 1 default por theme + templateType (cuando isDefault=true)
LayoutTemplateSchema.index(
  { companyThemeId: 1, templateType: 1, isDefault: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true },
    name: 'uniq_theme_type_default',
  },
);
