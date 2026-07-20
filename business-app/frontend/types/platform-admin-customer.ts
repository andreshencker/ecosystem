/**
 * Platform Admin customer types — sourced from the BI analytical model.
 * All data comes from GET /platform-admin/customers and /platform-admin/customers/:id.
 * The operational Customer MongoDB model is never used for these views.
 */

export interface BiCustomerLocationDetail {
  sourceLocationId: string | null;
  tag: string | null;
  country: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  state: string | null;
  fullAddress: string | null;
  isValidAddress: boolean;
  isLegacy: boolean;
}

export interface BiCustomerContactDetail {
  sourceContactId: string | null;
  contactName: string | null;
  roleOrPosition: string | null;
  email: string | null;
  phone: string | null;
  locationId: string | null;
  locationTag: string | null;
  isPrimary: boolean;
  hasEmail: boolean;
  hasPhone: boolean;
  hasLocation: boolean;
}

export interface BiCustomerRecipientDetail {
  channel: string;
  destination: string | null;
  recipientType: string | null;
  destinationNormalized: string | null;
  isValidDestination: boolean;
}

export interface BiCustomerPurposeDetail {
  communicationDomainId: string;
  configuredChannelCount: number;
  emailRecipientCount: number;
  smsRecipientCount: number;
  hasEmailChannel: boolean;
  hasSmsChannel: boolean;
  recipients: BiCustomerRecipientDetail[];
}

export interface BiCustomerListItem {
  customerId: string;
  businessId: string;
  businessName: string | null;
  customerName: string;
  customerType: string;
  abn: string | null;
  isActive: boolean;
  contactCount: number;
  locationCount: number;
  communicationPurposeCount: number;
  emailRecipientCount: number;
  smsRecipientCount: number;
  hasPrimaryContact: boolean;
  hasAbn: boolean;
  hasLocations: boolean;
  hasContacts: boolean;
  hasCommunicationConfiguration: boolean;
  dataQualityIssueCount: number;
  dataQualityIssues: string[] | null;
  sourceCreatedAt: string | null;
  sourceUpdatedAt: string | null;
  syncedAt: string | null;
}

export interface PlatformAdminCustomerListResponse {
  businessId: string;
  items: BiCustomerListItem[];
  total: number;
  page: number;
  limit: number;
  calculatedAt: string;
}

export interface BiCustomerDetailResponse {
  customerId: string;
  businessId: string;
  businessName: string | null;
  customerName: string;
  customerType: string;
  abn: string | null;
  isActive: boolean;
  notes: string | null;
  contactCount: number;
  locationCount: number;
  communicationPurposeCount: number;
  emailRecipientCount: number;
  smsRecipientCount: number;
  hasPrimaryContact: boolean;
  hasAbn: boolean;
  hasLocations: boolean;
  hasContacts: boolean;
  hasCommunicationConfiguration: boolean;
  dataQualityIssueCount: number;
  dataQualityIssues: string[];
  sourceCreatedAt: string | null;
  sourceUpdatedAt: string | null;
  syncedAt: string | null;
  locations: BiCustomerLocationDetail[];
  contacts: BiCustomerContactDetail[];
  purposes: BiCustomerPurposeDetail[];
}

// ─── Query params ─────────────────────────────────────────────────────────────

export interface PlatformAdminCustomersParams {
  search?: string;
  businessId?: string;
  customerType?: 'company' | 'individual';
  isActive?: boolean;
  hasContacts?: boolean;
  hasLocations?: boolean;
  hasCommunicationConfiguration?: boolean;
  hasDataQualityIssues?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

// ─── Data quality issue labels ────────────────────────────────────────────────

export const DATA_QUALITY_LABELS: Record<string, string> = {
  missing_abn: 'Missing ABN',
  missing_contacts: 'No contacts',
  missing_primary_contact: 'No primary contact',
  missing_locations: 'No locations',
  invalid_address: 'Invalid address',
  missing_communication_config: 'No communication configuration',
  invalid_email_recipient: 'Invalid email recipient',
  invalid_sms_recipient: 'Invalid SMS recipient',
  no_recipients: 'No recipients configured',
  stale_sync: 'Data may be stale',
};

export function formatDataQualityIssue(code: string): string {
  return DATA_QUALITY_LABELS[code] ?? code.replace(/_/g, ' ');
}
