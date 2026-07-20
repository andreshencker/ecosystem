import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

// ─── BillingRecipient sub-document ───────────────────────────────────────────

export const DOCUMENT_TYPES = [
  'invoice', 'quote', 'budget', 'purchase_order',
  'statement', 'receipt', 'contract', 'general', 'other',
] as const;
export type DocumentType = typeof DOCUMENT_TYPES[number];

export type BillingRecipientType = 'to' | 'cc' | 'bcc';

@Schema({ _id: false, versionKey: false })
export class BillingRecipient {
  /**
   * The type of business document this recipient should receive.
   * Defaults to 'invoice' for backward compatibility with existing records
   * that pre-date this field.
   */
  @Prop({ type: String, required: true, enum: DOCUMENT_TYPES, default: 'invoice' })
  documentType!: DocumentType;

  @Prop({ required: true, trim: true, lowercase: true })
  email!: string;

  @Prop({ required: true, enum: ['to', 'cc', 'bcc'] })
  recipientType!: BillingRecipientType;
}

export const BillingRecipientSchema = SchemaFactory.createForClass(BillingRecipient);

// ─── CustomerCommunicationPurpose sub-documents ───────────────────────────────

/** A single recipient within a channel (email or sms). */
@Schema({ _id: false, versionKey: false })
export class CommPurposeRecipient {
  /** Non-null for email recipients. Stored lowercase. */
  @Prop({ type: String, default: undefined, lowercase: true, trim: true })
  email?: string;

  /** Delivery role for email recipients. */
  @Prop({ type: String, enum: ['to', 'cc', 'bcc'], default: undefined })
  recipientType?: 'to' | 'cc' | 'bcc';

  /** Non-null for SMS recipients. */
  @Prop({ type: String, default: undefined, trim: true })
  phone?: string;
}

export const CommPurposeRecipientSchema = SchemaFactory.createForClass(CommPurposeRecipient);

/** A channel (email or sms) with its configured recipients. */
@Schema({ _id: false, versionKey: false })
export class CommPurposeChannel {
  @Prop({ required: true, enum: ['email', 'sms'] })
  channel!: 'email' | 'sms';

  @Prop({ type: [CommPurposeRecipientSchema], default: [] })
  recipients!: CommPurposeRecipient[];
}

export const CommPurposeChannelSchema = SchemaFactory.createForClass(CommPurposeChannel);

/** Customer-level configuration for one Communication Purpose. */
@Schema({ _id: false, versionKey: false })
export class CustomerCommPurpose {
  /** ObjectId string of the Communication Purpose (domain) in Communications App. */
  @Prop({ required: true, trim: true })
  communicationDomainId!: string;

  @Prop({ type: [CommPurposeChannelSchema], default: [] })
  channels!: CommPurposeChannel[];
}

export const CustomerCommPurposeSchema = SchemaFactory.createForClass(CustomerCommPurpose);

// ─── CustomerLocation sub-document ───────────────────────────────────────────

/** A named physical location for a customer (e.g. Head Office, Warehouse). */
@Schema({ _id: true, versionKey: false })
export class CustomerLocation {
  _id!: Types.ObjectId;

  /** User-defined label — e.g. "Warehouse", "Head Office". Required. */
  @Prop({ required: true, trim: true })
  tag!: string;

  @Prop({ required: true, trim: true })
  country!: string;

  @Prop({ required: true, trim: true })
  line1!: string;

  @Prop({ type: String, default: null, trim: true })
  line2!: string | null;

  @Prop({ required: true, trim: true })
  city!: string;

  @Prop({ required: true, trim: true })
  postalCode!: string;

  @Prop({ type: String, default: null, trim: true })
  state!: string | null;
}

export const CustomerLocationSchema = SchemaFactory.createForClass(CustomerLocation);

// ─── Contact sub-document ─────────────────────────────────────────────────────

@Schema({ _id: true, versionKey: false })
export class Contact {
  _id!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  firstName!: string;

  /** Last name — optional for contacts created with a single full-name field. */
  @Prop({ type: String, default: '', trim: true })
  lastName!: string;

  @Prop({ type: String, default: null, trim: true, lowercase: true })
  email!: string | null;

  @Prop({ type: String, default: null, trim: true })
  phone!: string | null;

  /** Job title or role within the customer organisation (e.g. "Accounts Payable"). */
  @Prop({ type: String, default: null, trim: true })
  role!: string | null;

  /** References a CustomerLocation._id within the same Customer document. Null = no assignment. */
  @Prop({ type: String, default: null, trim: true })
  locationId!: string | null;

  /**
   * Exactly one contact per customer should have isPrimary=true.
   * This mirrors the `contact` field for new records and is the canonical
   * source of truth for the primary contact going forward.
   */
  @Prop({ type: Boolean, default: false })
  isPrimary!: boolean;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);

// ─── CustomerAddress sub-document ────────────────────────────────────────────

@Schema({ _id: false, versionKey: false })
export class CustomerAddress {
  @Prop({ required: true, trim: true })
  country!: string;

  @Prop({ type: String, default: null, trim: true })
  state!: string | null;

  @Prop({ required: true, trim: true })
  city!: string;

  @Prop({ type: String, default: null, trim: true })
  postalCode!: string | null;

  @Prop({ required: true, trim: true })
  line1!: string;

  @Prop({ type: String, default: null, trim: true })
  line2!: string | null;
}

export const CustomerAddressSchema = SchemaFactory.createForClass(CustomerAddress);

// ─── PrimaryContact sub-document ─────────────────────────────────────────────
// Represents the main day-to-day contact person for a Customer.
// Distinct from the `contacts[]` array (named contacts within a company).

@Schema({ _id: false, versionKey: false })
export class PrimaryContact {
  /** Full name of the primary contact person (e.g. "John Smith"). */
  @Prop({ type: String, default: null, trim: true })
  name!: string | null;

  /** Primary contact email address. */
  @Prop({ type: String, default: null, trim: true, lowercase: true })
  email!: string | null;

  /** Primary contact phone number. */
  @Prop({ type: String, default: null, trim: true })
  phone!: string | null;
}

export const PrimaryContactSchema = SchemaFactory.createForClass(PrimaryContact);

// ─── Customer document ────────────────────────────────────────────────────────

export type CustomerDocument = HydratedDocument<Customer>;

export type CustomerType = 'company' | 'individual';

@Schema({
  collection: 'customers',
  timestamps: true,
  versionKey: false,
})
export class Customer {
  /** Tenant isolation key — ObjectId of the modules Company that owns this record. */
  @Prop({ required: true, index: true })
  companyId!: string;

  /** Whether this is a business entity or a natural person. */
  @Prop({ required: true, enum: ['company', 'individual'] })
  type!: CustomerType;

  /** Primary display name. For company: company name. For individual: full name. */
  @Prop({ required: true, trim: true })
  displayName!: string;

  /** Australian Business Number (11 digits). Only relevant for type='company'. */
  @Prop({ type: String, default: null, trim: true })
  abn!: string | null;

  /**
   * Primary contact person for this customer.
   * Replaces the flat `email` and `phone` fields for new records.
   * Null on existing records that pre-date this field.
   */
  @Prop({ type: PrimaryContactSchema, default: null })
  contact!: PrimaryContact | null;

  /**
   * @deprecated Replaced by `contact.email`. Kept for backward compatibility
   * with existing documents created before the contact refactor.
   */
  @Prop({ type: String, default: null, trim: true, lowercase: true })
  email!: string | null;

  /**
   * @deprecated Replaced by `contact.phone`. Kept for backward compatibility
   * with existing documents created before the contact refactor.
   */
  @Prop({ type: String, default: null, trim: true })
  phone!: string | null;

  /** Physical / registered address for this customer. Null on legacy records. */
  @Prop({ type: CustomerAddressSchema, default: null })
  address!: CustomerAddress | null;

  /** Free-text notes visible only to the business. */
  @Prop({ type: String, default: null, trim: true })
  notes!: string | null;

  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;

  /** Named contacts within a company-type customer. */
  @Prop({ type: [ContactSchema], default: [] })
  contacts!: Contact[];

  /**
   * Physical locations for this customer (office, warehouse, branch, etc.).
   * Replaces the single `address` field for new records.
   * Legacy records with only `address` get synthesized into locations[0] in the response.
   */
  @Prop({ type: [CustomerLocationSchema], default: [] })
  locations!: CustomerLocation[];

  /**
   * Communication Purpose configurations for this customer.
   * Each entry links one Communication Purpose to the recipient list for each
   * channel (email and/or SMS) defined by that purpose.
   * Customer is only responsible for recipients — credentials, templates, and
   * events remain in Communications.
   */
  @Prop({ type: [CustomerCommPurposeSchema], default: [] })
  communicationPurposes!: CustomerCommPurpose[];

  /**
   * @deprecated Replaced by `communicationPurposes`. Retained for backward
   * compatibility with existing documents created before the redesign.
   */
  @Prop({ type: [BillingRecipientSchema], default: [] })
  billingRecipients!: BillingRecipient[];
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

CustomerSchema.index({ companyId: 1, displayName: 1 });
CustomerSchema.index({ companyId: 1, isActive: 1 });
CustomerSchema.index({ companyId: 1, email: 1 });
