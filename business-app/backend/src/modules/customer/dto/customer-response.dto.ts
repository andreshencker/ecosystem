import type {
  CustomerDocument,
  Contact,
  BillingRecipient,
  CustomerType,
  BillingRecipientType,
  DocumentType,
  CustomerAddress,
  CustomerLocation,
  CustomerCommPurpose,
  CommPurposeChannel,
  CommPurposeRecipient,
} from '../schemas/customer.schema';

// ─── Location response ────────────────────────────────────────────────────────

export interface CustomerLocationResponseDto {
  id: string;
  tag: string;
  country: string;
  line1: string;
  line2: string | null;
  city: string;
  postalCode: string;
  state: string | null;
}

// ─── Communication Purpose sub-DTOs ──────────────────────────────────────────

export interface CommPurposeRecipientResponseDto {
  email?: string;
  recipientType?: 'to' | 'cc' | 'bcc';
  phone?: string;
}

export interface CommPurposeChannelResponseDto {
  channel: 'email' | 'sms';
  recipients: CommPurposeRecipientResponseDto[];
}

export interface CustomerCommPurposeResponseDto {
  communicationDomainId: string;
  channels: CommPurposeChannelResponseDto[];
}

// ─── Sub-DTOs ─────────────────────────────────────────────────────────────────

export interface PrimaryContactResponseDto {
  name: string | null;
  email: string | null;
  phone: string | null;
}

export interface BillingRecipientResponseDto {
  /** Document type this recipient is associated with. Defaults to 'invoice' for legacy records. */
  documentType: DocumentType;
  email: string;
  recipientType: BillingRecipientType;
}

export interface ContactResponseDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  isPrimary: boolean;
  /** References a CustomerLocation._id in the same Customer document. Null = unassigned. */
  locationId: string | null;
}

export interface CustomerAddressResponseDto {
  country:    string;
  state:      string | null;
  city:       string;
  postalCode: string | null;
  line1:      string;
  line2:      string | null;
}

// ─── Customer response ────────────────────────────────────────────────────────

export interface CustomerResponseDto {
  id: string;
  companyId: string;
  type: CustomerType;
  displayName: string;
  abn: string | null;
  /**
   * Primary contact summary — derived from the primary entry in `contacts[]`
   * or from the legacy `contact` field for backward compatibility.
   * Always present so the table / header can display the primary contact.
   */
  contact: PrimaryContactResponseDto;
  /** Physical / registered address. Null on legacy records without an address. */
  address: CustomerAddressResponseDto | null;
  notes: string | null;
  isActive: boolean;
  /**
   * All contacts for this customer, including the primary contact.
   * The primary contact has isPrimary=true. For legacy records that have only
   * the `contact` field set and no entries in `contacts[]`, a synthetic entry
   * is prepended so the count and list are always consistent.
   */
  contacts: ContactResponseDto[];
  /**
   * Physical locations. For legacy records with only a single `address`,
   * this is synthesized from that field so consumers always see an array.
   */
  locations: CustomerLocationResponseDto[];
  communicationPurposes: CustomerCommPurposeResponseDto[];
  billingRecipients: BillingRecipientResponseDto[];
  createdAt: string;
  updatedAt: string;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapLocation(l: CustomerLocation): CustomerLocationResponseDto {
  return {
    id:         String(l._id),
    tag:        l.tag,
    country:    l.country,
    line1:      l.line1,
    line2:      l.line2 ?? null,
    city:       l.city,
    postalCode: l.postalCode,
    state:      l.state ?? null,
  };
}

/**
 * Returns the locations array. For legacy records that have only a single
 * `address` sub-document and an empty `locations[]`, synthesizes one entry
 * so consumers always receive an array.
 */
function buildLocations(doc: any): CustomerLocationResponseDto[] {
  const stored: CustomerLocation[] = doc.locations ?? [];
  if (stored.length > 0) return stored.map(mapLocation);
  if (doc.address) {
    const a = doc.address;
    return [{
      id:         'legacy-address',
      tag:        'Main Address',
      country:    a.country,
      line1:      a.line1,
      line2:      a.line2  ?? null,
      city:       a.city,
      postalCode: a.postalCode ?? '',
      state:      a.state  ?? null,
    }];
  }
  return [];
}

function mapCommPurpose(p: CustomerCommPurpose): CustomerCommPurposeResponseDto {
  return {
    communicationDomainId: p.communicationDomainId,
    channels: ((p as any).channels ?? []).map((ch: any): CommPurposeChannelResponseDto => ({
      channel: ch.channel,
      recipients: ((ch as any).recipients ?? []).map((r: any): CommPurposeRecipientResponseDto => ({
        email:         r.email         ?? undefined,
        recipientType: r.recipientType ?? undefined,
        phone:         r.phone         ?? undefined,
      })),
    })),
  };
}

function mapBillingRecipient(r: BillingRecipient): BillingRecipientResponseDto {
  return {
    documentType: (r as any).documentType ?? 'invoice',
    email: r.email,
    // Backward compat: old records stored the field as `type` before the rename
    recipientType: (r as any).recipientType ?? (r as any).type ?? 'to',
  };
}

function mapContact(c: Contact): ContactResponseDto {
  return {
    id:         String(c._id),
    firstName:  c.firstName,
    lastName:   c.lastName ?? '',
    email:      c.email,
    phone:      c.phone,
    role:       c.role,
    isPrimary:  c.isPrimary ?? false,
    locationId: (c as any).locationId ?? null,
  };
}

/**
 * Derive the PrimaryContactResponseDto.
 *
 * Priority:
 *   1. First contact in contacts[] with isPrimary=true (new canonical model).
 *   2. Legacy `contact` field on the document.
 *   3. Oldest flat `email`/`phone` fields (pre-contact-refactor records).
 */
function mapPrimaryContact(doc: any): PrimaryContactResponseDto {
  // 1. Primary entry in contacts[]
  const primaryContact = (doc.contacts ?? []).find((c: any) => c.isPrimary);
  if (primaryContact) {
    const fullName = [primaryContact.firstName, primaryContact.lastName].filter(Boolean).join(' ');
    return {
      name:  fullName || null,
      email: primaryContact.email ?? null,
      phone: primaryContact.phone ?? null,
    };
  }
  // 2. Legacy contact sub-document
  if (doc.contact) {
    return {
      name:  doc.contact.name  ?? null,
      email: doc.contact.email ?? null,
      phone: doc.contact.phone ?? null,
    };
  }
  // 3. Pre-refactor flat fields
  return {
    name:  null,
    email: doc.email ?? null,
    phone: doc.phone ?? null,
  };
}

/**
 * Build the unified contacts array for the response.
 *
 * If contacts[] contains an isPrimary entry → use contacts[] as-is.
 * If contacts[] is empty but the legacy `contact` field is set → prepend a
 *   synthetic primary entry so the counter and list are always consistent.
 */
function buildContacts(doc: any): ContactResponseDto[] {
  const stored: Contact[] = doc.contacts ?? [];
  const hasPrimaryInArray = stored.some((c: any) => c.isPrimary);

  if (hasPrimaryInArray || !doc.contact) {
    return stored.map(mapContact);
  }

  // Legacy record: synthesize a primary contact entry from the `contact` field.
  const legacy = doc.contact;
  const syntheticName = legacy.name ?? '';
  const synthetic: ContactResponseDto = {
    id:         'legacy-primary',  // sentinel — not a real ObjectId
    firstName:  syntheticName,
    lastName:   '',
    email:      legacy.email ?? null,
    phone:      legacy.phone ?? null,
    role:       null,
    isPrimary:  true,
    locationId: null,
  };

  return [synthetic, ...stored.map(mapContact)];
}

function mapAddress(a: CustomerAddress | null | undefined): CustomerAddressResponseDto | null {
  if (!a) return null;
  return {
    country:    a.country,
    state:      a.state      ?? null,
    city:       a.city,
    postalCode: a.postalCode ?? null,
    line1:      a.line1,
    line2:      a.line2      ?? null,
  };
}

export function toCustomerResponse(
  doc: CustomerDocument | Record<string, any>,
): CustomerResponseDto {
  const d = doc as any;
  return {
    id:          String(d._id),
    companyId:   d.companyId,
    type:        d.type,
    displayName: d.displayName,
    abn:         d.abn ?? null,
    contact:     mapPrimaryContact(d),
    address:     mapAddress(d.address),
    notes:       d.notes ?? null,
    isActive:    d.isActive,
    contacts:    buildContacts(d),
    locations:   buildLocations(d),
    communicationPurposes: (d.communicationPurposes ?? []).map(mapCommPurpose),
    billingRecipients: (d.billingRecipients ?? []).map(mapBillingRecipient),
    createdAt:
      d.createdAt instanceof Date
        ? d.createdAt.toISOString()
        : String(d.createdAt ?? ''),
    updatedAt:
      d.updatedAt instanceof Date
        ? d.updatedAt.toISOString()
        : String(d.updatedAt ?? ''),
  };
}
