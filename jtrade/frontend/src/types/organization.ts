// src/types/organization.ts

export type UsdtNetwork = '' | 'TRC20' | 'ERC20' | 'BEP20';

/** Grapifly-owned organization profile, surfaced through jtrade's pass-through. */
export interface Organization {
    organizationId: string;
    name: string;
    slug: string;
    status: 'active' | 'suspended' | 'archived';
    entityType: 'company' | 'individual';
    legalName: string;
    tagline: string;
    timezone: string;
    officialEmail: string;
    supportEmail: string;
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
    usdtNetwork: UsdtNetwork;
    membership?: { role: 'owner' | 'admin' | 'member' };
}

export type OrganizationPatch = Partial<Record<keyof Organization, string>>;
