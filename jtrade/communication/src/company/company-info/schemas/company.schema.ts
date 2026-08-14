// src/company-info/schemas/company.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CompanyDocument = HydratedDocument<Company>;

@Schema({
  collection: 'companies',
  timestamps: true,
  versionKey: false,
})
export class Company {
  @Prop({
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
    index: true,
  })
  companyKey!: string; // "jtrade"

  @Prop({ required: true, trim: true })
  displayName!: string;

  @Prop({ type: String, default: '' })
  legalName!: string;

  @Prop({ type: String, default: '' })
  tagline!: string;

  @Prop({ type: String, default: 'Australia/Sydney' })
  timezone!: string;

  // =========================
  // CONTACT (PLANO)
  // =========================
  @Prop({ type: String, default: '' })
  supportEmail!: string;

  @Prop({ type: String, default: '' })
  supportPhone!: string;

  @Prop({ type: String, default: '' })
  supportHours!: string;

  // =========================
  // ADDRESS (PLANO)
  // =========================
  @Prop({ type: String, default: null })
  addressLine1!: string | null;

  @Prop({ type: String, default: null })
  addressLine2!: string | null;

  @Prop({ type: String, default: null })
  addressCity!: string | null;

  @Prop({ type: String, default: null })
  addressState!: string | null;

  @Prop({ type: String, default: null })
  addressPostalCode!: string | null;

  @Prop({ type: String, default: null })
  addressCountry!: string | null;

  // =========================
  // URLS (PLANO)
  // =========================
  @Prop({ type: String, default: '' })
  webBaseUrl!: string;

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

  // =========================
  // SOCIALS (PLANO)
  // =========================
  @Prop({ type: String, default: null })
  facebook!: string | null;

  @Prop({ type: String, default: null })
  instagram!: string | null;

  @Prop({ type: String, default: null })
  linkedin!: string | null;

  @Prop({ type: String, default: null })
  x!: string | null;

  @Prop({ type: String, default: null })
  youtube!: string | null;

  @Prop({ type: String, default: null })
  tiktok!: string | null;

  @Prop({ type: String, default: null })
  whatsapp!: string | null;

  @Prop({ type: String, default: null })
  telegram!: string | null;

  // =========================
  // LEGAL (PLANO)
  // =========================
  @Prop({ type: String, default: '' })
  copyrightText!: string;

  @Prop({ type: String, default: '' })
  disclaimerShort!: string;

  @Prop({ type: String, default: '' })
  disclaimerLong!: string;

  // =========================
  // LOGOS (PLANO) ✅ NUEVO
  // =========================
  @Prop({ type: String, default: '' })
  logoIconUrl!: string; // ej: https://.../logo-icon.png

  @Prop({ type: String, default: '' })
  logoFullUrl!: string; // ej: https://.../logo-full.png

  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;
}

export const CompanySchema = SchemaFactory.createForClass(Company);

CompanySchema.index({ companyKey: 1 }, { unique: true });
CompanySchema.index({ isActive: 1 });
