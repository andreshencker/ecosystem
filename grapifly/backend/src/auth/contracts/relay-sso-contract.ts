export interface RelayOrganizationContract {
  organizationId: string;
  name: string;
  slug: string;
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

export interface RelaySsoIdentityContract {
  contractVersion: 2;
  issuer: 'grapifly';
  audience: 'relay';
  grapiflyUserId: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  avatarUrl: string | null;
  organization: RelayOrganizationContract;
  access: {
    organizationRole: 'owner' | 'admin' | 'member';
    applicationRole: 'owner' | 'admin' | 'operator' | 'viewer';
    permissions: string[];
  };
}
