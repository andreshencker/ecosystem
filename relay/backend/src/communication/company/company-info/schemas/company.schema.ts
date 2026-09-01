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
  /** Stable tenant identifier issued by Grapifly. Relay owns only the technical projection. */
  @Prop({ type: String, default: null })
  grapiflyOrganizationId!: string | null;

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

  /** Official company email — used for billing, default sender, SMTP config and communications. Set at registration. */
  @Prop({ type: String, default: '', trim: true, lowercase: true })
  companyEmail!: string;

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

  // =========================
  // PAYOUT — where this company receives money for what it sells
  // =========================
  @Prop({ type: String, default: '' })
  bankAccountHolder!: string;

  @Prop({ type: String, default: '' })
  bankName!: string;

  @Prop({ type: String, default: '' })
  bankAccountNumber!: string;

  @Prop({ type: String, default: '' })
  bankSwiftBic!: string;

  @Prop({ type: String, default: '' })
  bankCountry!: string;

  /** USDT payout wallet — paired with usdtNetwork (both set together or not at all). */
  @Prop({ type: String, default: '' })
  usdtWalletAddress!: string;

  @Prop({ type: String, enum: ['', 'TRC20', 'ERC20', 'BEP20'], default: '' })
  usdtNetwork!: '' | 'TRC20' | 'ERC20' | 'BEP20';

  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;

  // Marks the single Grapifly modules operator company (DEC-007 / ADR-005).
  // Never set by tenant-facing APIs — bootstrap-only.
  @Prop({ type: Boolean, default: false })
  isPlatformCompany!: boolean;

  // ObjectId string of the company_owner user. Set atomically on company creation. (DEC-009 Rev-2)
  @Prop({ type: String, default: null })
  ownerUserId!: string | null;
}

export const CompanySchema = SchemaFactory.createForClass(Company);

// Unique partial index: at most one document may have isPlatformCompany === true.
// (companyKey and isActive indexes are declared via index: true / unique: true in @Prop above.)
CompanySchema.index(
  { isPlatformCompany: 1 },
  { unique: true, partialFilterExpression: { isPlatformCompany: true } },
);
CompanySchema.index(
  { grapiflyOrganizationId: 1 },
  { unique: true, sparse: true },
);
