/** Versioned contract issued exclusively by Grapifly for ecosystem applications. */
export interface GrapiflyOrganizationContract {
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
  bankAccountHolder: string;
  bankName: string;
  bankAccountNumber: string;
  bankSwiftBic: string;
  bankCountry: string;
  usdtWalletAddress: string;
  usdtNetwork: '' | 'TRC20' | 'ERC20' | 'BEP20';
  isPlatform: boolean;
  isDefault: boolean;
  status: 'active' | 'suspended' | 'archived';
}

export interface GrapiflyRelaySsoContract {
  contractVersion: 3;
  issuer: 'grapifly';
  audience: 'relay';
  grapiflyUserId: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  avatarUrl: string | null;
  organization: GrapiflyOrganizationContract;
  access: {
    flow: 'client' | 'provider' | 'internal';
    organizationRole: 'owner' | 'admin' | 'member';
    applicationRole: string;
    // No permissions field — Grapifly only returns the raw role. Relay derives
    // its own permission vocabulary locally, see AuthService.relayPermissions().
  };
}
