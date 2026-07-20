// ─── Auth ────────────────────────────────────────────────────────────────────

export type UserRole = 'platform_admin' | 'company_admin' | 'company_user' | 'viewer';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isEmailVerified: boolean;
  role?: UserRole;
  companyId?: string | null;
  companyKey?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// ─── Company ─────────────────────────────────────────────────────────────────

export interface Company {
  id: string;
  companyKey: string;
  displayName: string;
  legalName?: string;
  tagline?: string;
  timezone: string;
  logoIconUrl?: string;
  logoFullUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Company Theme ────────────────────────────────────────────────────────────

export interface CompanyTheme {
  id: string;
  companyId: string;
  label: string;
  primaryColor: string;
  secondaryColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  mutedTextColor?: string;
  borderColor?: string;
  linkColor?: string;
  fontFamily?: string;
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
}

// ─── Provider ────────────────────────────────────────────────────────────────

export interface Provider {
  id: string;
  providerKey: string;
  displayName: string;
  channelId: string | Channel;
  connectionType: 'api_key' | 'smtp' | 'oauth' | 'access_keys';
  isActive: boolean;
}

// ─── Company Channel Provider ────────────────────────────────────────────────

export interface CompanyChannelProvider {
  id: string;
  companyId: string;
  providerId: string | Provider;
  channelId: string | Channel;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

// ─── Provider Credentials ────────────────────────────────────────────────────

export interface ProviderCredentials {
  id: string;
  companyChannelProviderId: string | CompanyChannelProvider;
  tag: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
}

// ─── Event Catalogue ─────────────────────────────────────────────────────────

export interface EventCatalogue {
  id: string;
  domainCatalogueId: string | DomainCatalogue;
  eventKey: string;
  displayName: string;
  description?: string;
  eventType: 'notification' | 'alert' | 'request';
  channelContent: Record<string, unknown>;
  isActive: boolean;
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

// ─── API Error ───────────────────────────────────────────────────────────────

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}
