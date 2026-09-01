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

/**
 * Issued for any appKey registered (and active) in the Applications catalogue —
 * not Relay-specific. `audience` echoes back whichever appKey the caller
 * requested and was granted access for.
 */
export interface EcosystemSsoIdentityContract {
  contractVersion: 3;
  issuer: 'grapifly';
  audience: string;
  grapiflyUserId: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  avatarUrl: string | null;
  organization: RelayOrganizationContract;
  access: {
    flow: 'client' | 'provider' | 'internal';
    organizationRole: 'owner' | 'admin' | 'member';
    // App-defined (RoleCatalogService), not a fixed shared union.
    applicationRole: string;
    tier: 'trial' | 'free' | 'paid';
    // No permissions here by design — Grapifly only knows the raw role.
    // Each consuming app owns its own role→permission vocabulary locally.
  };
}
