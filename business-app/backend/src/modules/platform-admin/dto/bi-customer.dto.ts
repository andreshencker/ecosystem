/**
 * TypeScript types mirroring the BI service's Platform Admin customer contracts.
 * Source of truth: business-intelligence/app/contracts/customers/platform_admin_schema.py
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

export interface BiCustomerListResponse {
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
