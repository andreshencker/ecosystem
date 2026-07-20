// ─── Auth ────────────────────────────────────────────────────────────────────

export type UserRole =
  | 'platform_admin'
  | 'business_owner'
  | 'business_admin'
  | 'accountant'
  | 'staff'
  | 'viewer';

export type Scope = 'global' | 'company';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  role: UserRole;
  scope: Scope;
  companyId: string | null;
  businessKey: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  /** Set for admin-invited users; triggers password-change redirect on first login (DEC-013). */
  mustChangePassword?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

// ─── Business ────────────────────────────────────────────────────────────────

export interface Business {
  id: string;
  businessKey: string;
  businessName: string;
  ownerUserId: string | null;
  abn: string | null;
  depositAccount: {
    bsb: string | null;
    accountNumber: string | null;
  };
  defaultCurrency: string;
  isActive: boolean;
  isPlatformCompany: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Create Business With Owner ──────────────────────────────────────────────

export interface CreateCompanyWithOwnerResponse {
  company: Business;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  emailDelivered: boolean;
  message: string;
}

// ─── Company Integrations ─────────────────────────────────────────────────────

export type IntegrationEnvironment = 'development' | 'staging' | 'production';

export interface CompanyIntegration {
  id: string;
  companyId: string;
  integrationKey: string;
  displayName: string;
  description: string;
  environment: IntegrationEnvironment;
  /** Safe display prefix. Raw token is never included in list/get responses. */
  tokenPrefix: string;
  isActive: boolean;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Returned only on create and rotate-token. */
export interface CompanyIntegrationWithToken extends CompanyIntegration {
  rawToken: string;
}

/** Platform Admin view — includes company context. Raw token never included. */
export interface CompanyIntegrationPlatformView extends CompanyIntegration {
  companyDisplayName: string;
  companyKey: string;
}

// ─── Company Theme ────────────────────────────────────────────────────────────

export interface CompanyTheme {
  id: string;
  companyId: string;
  label: string;
  // Colors
  primaryColor: string;
  secondaryColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  mutedTextColor?: string;
  borderColor?: string;
  linkColor?: string;
  // Typography
  fontFamily?: string;
  fontSizeBase?: string;
  fontWeightNormal?: number;
  fontWeightBold?: number;
  // Flags
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Channel ─────────────────────────────────────────────────────────────────

export interface Channel {
  id: string;
  channelKey: string;
  displayName: string;
  description?: string;
  contentFormat: 'html' | 'text' | 'binary';
  supportsTemplates: boolean;
  supportsFiles: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export interface Provider {
  id: string;
  providerKey: string;
  displayName: string;
  description?: string;
  channelId: string | Channel;
  connectionType: 'api_key' | 'smtp' | 'oauth' | 'access_keys';
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Company Channel Provider ────────────────────────────────────────────────

// Populated mini-objects returned by the backend when populate=true.
// The backend mapper always puts these in separate `provider` / `channel` keys;
// providerId and channelId remain as plain string IDs.
export interface ProviderMini {
  id: string;
  providerKey?: string;
  displayName?: string;
  connectionType?: string;
  isActive?: boolean;
  channelId?: string;
}

export interface ChannelMini {
  id: string;
  channelKey?: string;
  displayName?: string;
  isActive?: boolean;
}

export interface CompanyChannelProvider {
  id: string;
  companyId: string;
  providerId: string | Provider;
  channelId: string | Channel;
  // Populated when populate=true (backend mapper separates them from the ID fields)
  provider?: ProviderMini;
  channel?: ChannelMini;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Provider Credentials ────────────────────────────────────────────────────

export interface ProviderCredentials {
  id: string;
  companyChannelProviderId: string | CompanyChannelProvider;
  tag: string;
  isActive: boolean;
  /** Non-secret display identifier derived on the backend before encryption. Undefined for records created before this field existed. */
  displayIdentifier?: string;
  createdAt: string;
  updatedAt: string;
  /** Populated when the backend is called with populate=true or via the company-wide endpoint. */
  companyChannelProvider?: {
    id: string;
    companyId: string;
    isActive: boolean;
    provider?: { id: string; providerKey: string; connectionType: string; displayName?: string };
    channel?: { id: string; channelKey: string; displayName?: string };
  };
}

// ─── Domain Catalogue ────────────────────────────────────────────────────────

export interface ChannelToUse {
  channel: 'email' | 'sms';
  providerCredentialsId: string | ProviderCredentials;
}

export interface DomainCatalogue {
  id: string;
  companyId: string;
  domainKey: string;
  displayName: string;
  domainCategory: string;
  channelsToUse: ChannelToUse[];
  isActive: boolean;
  /** Platform-provisioned domains. Cannot be deleted; core fields are read-only. */
  isSystem: boolean;
  createdAt: string;
  updatedAt?: string;
}

// ─── Event Catalogue ─────────────────────────────────────────────────────────

export interface EmailChannelContent {
  enabled: boolean;
  subject?: string;
  content?: string;
  requiredVariables?: string[];
  optionalVariables?: string[];
  files?: {
    required?: string[];
    optional?: string[];
  };
}

export interface SmsChannelContent {
  enabled: boolean;
  content?: string;
  requiredVariables?: string[];
  optionalVariables?: string[];
}

export interface EventChannelContent {
  email?: EmailChannelContent;
  sms?: SmsChannelContent;
}

export interface EventCatalogue {
  id: string;
  domainCatalogueId: string | DomainCatalogue;
  eventKey: string;
  displayName: string;
  description?: string;
  eventType: 'notification' | 'alert' | 'request' | 'security';
  channelContent: EventChannelContent;
  isActive: boolean;
  scope?: 'platform' | 'company';
  createdAt?: string;
  updatedAt?: string;
}

// ─── Layout Template ─────────────────────────────────────────────────────────

export interface LayoutTemplate {
  id: string;
  companyThemeId: string | CompanyTheme;
  templateType: 'email' | 'pdf';
  key: string;
  name: string;
  html?: string;
  css?: string;
  requiredVariables: string[];
  optionalVariables: string[];
  isDefault: boolean;
  isActive: boolean;
  updatedAt: string;
}

// ─── Notification ────────────────────────────────────────────────────────────

export interface NotificationResult {
  channel: 'EMAIL' | 'SMS' | 'STORAGE';
  provider: string;
  success: boolean;
  error?: string | null;
}

export interface NotificationResponse {
  eventKey: string;
  companyId: string;
  results: NotificationResult[];
}

// ─── Company SMTP ────────────────────────────────────────────────────────────

export interface CompanySmtpConfig {
  companyId: string;
  fromEmail: string;
  fromName: string;
  hasCredentials: boolean;
  isActive: boolean;
  verifiedAt: string | null;
}

// ─── Invitation ──────────────────────────────────────────────────────────────

/** pending_delivery = user created, email not sent (SMTP unconfigured). DEC-013. */
export type InvitationStatus = 'pending' | 'pending_delivery' | 'accepted' | 'expired' | 'cancelled';
export type InvitationScope = 'platform' | 'company';

export interface Invitation {
  id: string;
  /** ObjectId of the user created by this invitation (DEC-013). */
  userId?: string | null;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId: string | null;
  businessKey: string | null;
  expiresAt: string;
  status: InvitationStatus;
  invitedByUserId: string | null;
  invitationScope: InvitationScope;
  senderCredentialScope: InvitationScope;
  createdAt: string;
  updatedAt: string;
}

/** Response from POST /users/invite (DEC-013). */
export interface InviteUserResult {
  userId: string;
  invitationId: string;
  email: string;
  role: string;
  emailDelivered: boolean;
  message: string;
}

// ─── API Error ───────────────────────────────────────────────────────────────

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}
