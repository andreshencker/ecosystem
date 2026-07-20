export type CustomerType = 'company' | 'individual';

// ─── Customer Locations ───────────────────────────────────────────────────────

export interface CustomerLocation {
  id: string;
  tag: string;
  country: string;
  line1: string;
  line2: string | null;
  city: string;
  postalCode: string;
  state: string | null;
}

/** Payload shape sent to create/update endpoints. */
export interface LocationPayload {
  /** Existing DB ObjectId — preserved across saves so contact locationId refs stay stable. */
  id?: string;
  tag: string;
  country: string;
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  state?: string;
}

// ─── Communication Purpose configuration ─────────────────────────────────────

export interface CommPurposeRecipient {
  /** Present for email channel recipients. */
  email?: string;
  /** Delivery role for email recipients. */
  recipientType?: 'to' | 'cc' | 'bcc';
  /** Present for SMS channel recipients. */
  phone?: string;
}

export interface CommPurposeChannel {
  channel: 'email' | 'sms';
  recipients: CommPurposeRecipient[];
}

export interface CustomerCommPurpose {
  communicationDomainId: string;
  channels: CommPurposeChannel[];
}

// ─── Form-level types for Communication Purpose configuration ─────────────────

export interface CommPurposeEmailRecipient {
  email: string;
  recipientType: 'to' | 'cc' | 'bcc';
}

export interface CommPurposeSmsRecipient {
  phone: string;
}

/** Shape used inside react-hook-form for one configured Communication Purpose. */
export interface CommPurposeFormEntry {
  communicationDomainId: string;
  /** Email recipients — populated when the purpose has an email channel. */
  emailRecipients: CommPurposeEmailRecipient[];
  /** SMS recipients — populated when the purpose has an SMS channel. */
  smsRecipients: CommPurposeSmsRecipient[];
}

export type BillingRecipientType = 'to' | 'cc' | 'bcc';

export type DocumentType =
  | 'invoice'
  | 'quote'
  | 'budget'
  | 'purchase_order'
  | 'statement'
  | 'receipt'
  | 'contract'
  | 'general'
  | 'other';

export const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: 'invoice',        label: 'Invoice' },
  { value: 'quote',          label: 'Quote' },
  { value: 'budget',         label: 'Budget' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'statement',      label: 'Statement' },
  { value: 'receipt',        label: 'Receipt' },
  { value: 'contract',       label: 'Contract' },
  { value: 'general',        label: 'General' },
  { value: 'other',          label: 'Other' },
];

export interface CustomerBillingRecipient {
  documentType:  DocumentType;
  email:         string;
  recipientType: BillingRecipientType;
}

export interface CustomerAddress {
  country:    string;
  state:      string | null;
  city:       string;
  postalCode: string | null;
  line1:      string;
  line2:      string | null;
}

/**
 * A contact person for a customer.
 * isPrimary=true identifies the primary/day-to-day contact.
 * The contacts[] array always includes the primary contact.
 */
export interface CustomerContact {
  id:         string;
  firstName:  string;
  lastName:   string;
  email:      string | null;
  phone:      string | null;
  role:       string | null;
  isPrimary:  boolean;
  /** References a CustomerLocation.id within the same Customer document. Null = unassigned. */
  locationId: string | null;
}

/** Returns the display name for a contact (combines firstName + lastName). */
export function contactDisplayName(c: Pick<CustomerContact, 'firstName' | 'lastName'>): string {
  return [c.firstName, c.lastName].filter(Boolean).join(' ');
}

/**
 * Primary contact summary — derived at the API layer from the isPrimary entry
 * in contacts[], or from the legacy `contact` field for backward compat.
 */
export interface CustomerPrimaryContact {
  name:  string | null;
  email: string | null;
  phone: string | null;
}

export interface Customer {
  id:                string;
  companyId:         string;
  type:              CustomerType;
  displayName:       string;
  abn:               string | null;
  /** Derived primary contact summary (backward compat + table display). */
  contact:           CustomerPrimaryContact;
  address:           CustomerAddress | null;
  notes:             string | null;
  isActive:          boolean;
  /**
   * All contacts including the primary one (isPrimary=true).
   * For legacy records the primary is synthesized from the `contact` field.
   */
  contacts:          CustomerContact[];
  /** Physical locations. Legacy single-address records are synthesized into locations[0]. */
  locations:         CustomerLocation[];
  communicationPurposes: CustomerCommPurpose[];
  billingRecipients: CustomerBillingRecipient[];
  createdAt:         string;
  updatedAt:         string;
}

export interface CustomerListResponse {
  items: Customer[];
  total: number;
  page:  number;
  limit: number;
}

// ─── Contact payload shapes (for form field arrays) ───────────────────────────

/** Shape used inside create/update payloads — matches the new EmbeddedContactDto. */
export interface ContactPayload {
  firstName: string;
  lastName?:  string;
  email?:    string;
  phone?:    string;
  role?:     string;
  isPrimary?: boolean;
  /** Index into the co-submitted locations array. Backend resolves this to a stable locationId. */
  locationIndex?: number | null;
}

export interface CreateCustomerPayload {
  type:        CustomerType;
  displayName: string;
  abn?:        string;
  /** Unified contacts array (new canonical path). Supersedes legacy `contact` field. */
  contacts?: ContactPayload[];
  /** Legacy primary contact field — kept for backward compat. */
  contact?: {
    name:   string;
    email?: string;
    phone?: string;
  };
  notes?:       string;
  locations?:   LocationPayload[];
  communicationPurposes?: CustomerCommPurpose[];
}

export interface UpdateCustomerPayload {
  displayName?: string;
  abn?:         string;
  /** Unified contacts array — replaces entire contacts[] atomically when provided. */
  contacts?: ContactPayload[];
  /** Legacy primary contact patch. */
  contact?: {
    name?:  string;
    email?: string;
    phone?: string;
  };
  notes?:       string;
  locations?:   LocationPayload[];
  communicationPurposes?: CustomerCommPurpose[];
}

export interface CreateContactPayload {
  firstName: string;
  lastName?:  string;
  email?:    string;
  phone?:    string;
  role?:     string;
  isPrimary?: boolean;
  /** ObjectId of an existing CustomerLocation within the same Customer document. */
  locationId?: string | null;
}

export interface UpdateContactPayload {
  firstName?: string;
  lastName?:  string;
  email?:     string;
  phone?:     string;
  role?:      string;
  isPrimary?: boolean;
  locationId?: string | null;
}
