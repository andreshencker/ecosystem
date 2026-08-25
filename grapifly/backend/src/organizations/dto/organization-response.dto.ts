/**
 * What an organization looks like over the wire — never expose the raw
 * Mongoose document (its _id, __v) directly from a controller.
 */
export interface OrganizationResponseDto {
  organizationId: string;
  name: string;
  slug: string;
  createdBy: string;
  entityType: 'company' | 'individual';
  legalName: string;
  tagline: string;
  timezone: string;
  officialEmail: string;
  supportEmail: string;
  supportPhone: string;
  supportPhoneCountryCode: string;
  supportPhoneNumber: string;
  supportHours: string;
  addressLine1: string;
  addressLine2: string;
  addressCity: string;
  addressState: string;
  addressPostalCode: string;
  addressCountry: string;
  websiteUrl: string;
  apiBaseUrl: string;
  helpCenterUrl: string;
  privacyPolicyUrl: string;
  termsUrl: string;
  unsubscribeUrl: string;
  facebook: string;
  instagram: string;
  linkedin: string;
  x: string;
  youtube: string;
  tiktok: string;
  whatsapp: string;
  telegram: string;
  copyrightText: string;
  disclaimerShort: string;
  disclaimerLong: string;
  logoIconUrl: string;
  logoFullUrl: string;
  isPlatform: boolean;
  isDefault: boolean;
  status: 'active' | 'suspended' | 'archived';
}

const FIELDS: (keyof OrganizationResponseDto)[] = [
  'organizationId', 'name', 'slug', 'createdBy', 'entityType', 'legalName', 'tagline', 'timezone',
  'officialEmail', 'supportEmail', 'supportPhone', 'supportPhoneCountryCode', 'supportPhoneNumber', 'supportHours',
  'addressLine1', 'addressLine2', 'addressCity', 'addressState', 'addressPostalCode', 'addressCountry',
  'websiteUrl', 'apiBaseUrl', 'helpCenterUrl', 'privacyPolicyUrl', 'termsUrl', 'unsubscribeUrl',
  'facebook', 'instagram', 'linkedin', 'x', 'youtube', 'tiktok', 'whatsapp', 'telegram',
  'copyrightText', 'disclaimerShort', 'disclaimerLong', 'logoIconUrl', 'logoFullUrl',
  'isPlatform', 'isDefault', 'status',
];

export function toOrganizationResponse(entry: OrganizationResponseDto): OrganizationResponseDto {
  const response = {} as OrganizationResponseDto;
  for (const field of FIELDS) (response[field] as unknown) = entry[field];
  return response;
}
