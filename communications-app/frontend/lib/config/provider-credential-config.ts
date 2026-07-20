// Canonical provider credential configuration.
// Keys the form renders dynamically based on providerKey (specific) or
// connectionType (fallback). Nothing in this file goes to the database —
// these are display / UX definitions only.

export type CredentialFieldType = 'text' | 'password' | 'number' | 'boolean';

export interface CredentialFieldConfig {
  /** Key as expected by the backend contract's ALLOWED list. */
  key: string;
  label: string;
  type: CredentialFieldType;
  required: boolean;
  placeholder?: string;
  helperText?: string;
  /** Applied in create mode for optional fields the user leaves blank. */
  defaultValue?: string | number | boolean;
  /** 'basic' fields are always visible; 'advanced' are collapsible. */
  section: 'basic' | 'advanced';
}

export interface ProviderCredentialConfig {
  connectionTypeLabel: string;
  /** Provider-level hint rendered above the form fields. */
  helperText?: string;
  basicFields: CredentialFieldConfig[];
  advancedFields: CredentialFieldConfig[];
}

// ─── Provider-specific configs (keyed by providerKey) ────────────────────────

const GMAIL: ProviderCredentialConfig = {
  connectionTypeLabel: 'SMTP',
  helperText:
    'Use a Google App Password, not your regular Gmail password. Enable 2-Step Verification in your Google Account first, then generate an App Password under Security → App Passwords.',
  basicFields: [
    { key: 'user', label: 'Gmail Address', type: 'text',     required: true,  placeholder: 'you@gmail.com',    section: 'basic' },
    { key: 'pass', label: 'App Password',  type: 'password', required: true,  placeholder: 'xxxx xxxx xxxx xxxx', section: 'basic' },
  ],
  advancedFields: [
    { key: 'host',      label: 'SMTP Host',   type: 'text',    required: true,  defaultValue: 'smtp.gmail.com', section: 'advanced' },
    { key: 'port',      label: 'Port',        type: 'number',  required: true,  defaultValue: 587,              section: 'advanced', placeholder: '587' },
    { key: 'secure',    label: 'Use TLS (port 465)', type: 'boolean', required: false, defaultValue: false,    section: 'advanced' },
    { key: 'fromName',  label: 'From Name',   type: 'text',    required: false, placeholder: 'My Company',      section: 'advanced' },
    { key: 'fromEmail', label: 'From Email',  type: 'text',    required: false, placeholder: 'you@gmail.com',   section: 'advanced' },
  ],
};

const SENDGRID: ProviderCredentialConfig = {
  connectionTypeLabel: 'API Key',
  helperText:
    'Create an API key in your SendGrid dashboard under Settings → API Keys. Use "Full Access" or a key with at least "Mail Send" permission.',
  basicFields: [
    { key: 'apiKey', label: 'SendGrid API Key', type: 'password', required: true, placeholder: 'SG.xxxxxxxxxxxx', section: 'basic' },
  ],
  advancedFields: [
    { key: 'fromName',  label: 'From Name',  type: 'text', required: false, placeholder: 'My Company', section: 'advanced' },
    { key: 'fromEmail', label: 'From Email', type: 'text', required: false, placeholder: 'noreply@example.com', section: 'advanced' },
  ],
};

const MAILGUN: ProviderCredentialConfig = {
  connectionTypeLabel: 'API Key',
  helperText:
    'Use your Mailgun private API key (starts with key-). Find it in the Mailgun dashboard under Settings → API Keys.',
  basicFields: [
    { key: 'apiKey',  label: 'Mailgun API Key', type: 'password', required: true, placeholder: 'key-xxxxxxxxxxxx', section: 'basic' },
    { key: 'domain', label: 'Sending Domain',   type: 'text',    required: true, placeholder: 'mg.example.com',   section: 'basic',
      helperText: 'The verified sending domain configured in your Mailgun account.' },
  ],
  advancedFields: [
    { key: 'baseUrl',   label: 'Base URL (EU)',  type: 'text', required: false, placeholder: 'https://api.eu.mailgun.net',
      helperText: 'Leave blank for US region. Set to https://api.eu.mailgun.net for EU accounts.', section: 'advanced' },
    { key: 'fromName',  label: 'From Name',  type: 'text', required: false, placeholder: 'My Company', section: 'advanced' },
    { key: 'fromEmail', label: 'From Email', type: 'text', required: false, placeholder: 'noreply@example.com', section: 'advanced' },
  ],
};

const TWILIO: ProviderCredentialConfig = {
  connectionTypeLabel: 'API Key',
  helperText:
    'Find your Account SID and Auth Token on the Twilio Console Dashboard (console.twilio.com). Use a Twilio phone number in E.164 format for the from number.',
  basicFields: [
    { key: 'accountSid', label: 'Account SID',      type: 'text',     required: true, placeholder: 'ACxxxxxxxxxxxxxxxx', section: 'basic' },
    { key: 'authToken',  label: 'Auth Token',        type: 'password', required: true, placeholder: 'your auth token',   section: 'basic' },
    { key: 'fromNumber', label: 'From Phone Number', type: 'text',     required: true, placeholder: '+61400000000',
      helperText: 'Must be in E.164 format, e.g. +61400000000', section: 'basic' },
  ],
  advancedFields: [],
};

const AWS_S3: ProviderCredentialConfig = {
  connectionTypeLabel: 'Access Keys',
  helperText:
    'The IAM user must have s3:GetObject, s3:PutObject, s3:DeleteObject, and s3:ListBucket permissions on the target bucket.',
  basicFields: [
    { key: 'accessKeyId',     label: 'Access Key ID',     type: 'text',     required: true,  placeholder: 'AKIAIOSFODNN7EXAMPLE', section: 'basic' },
    { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true,  placeholder: 'wJalrXUtnFEMI/K7MDENG/…', section: 'basic' },
    { key: 'region',          label: 'AWS Region',        type: 'text',     required: true,  placeholder: 'ap-southeast-2', section: 'basic' },
    { key: 'bucket',          label: 'Bucket Name',       type: 'text',     required: true,  placeholder: 'my-storage-bucket', section: 'basic' },
  ],
  advancedFields: [
    { key: 'endpoint',      label: 'Custom Endpoint', type: 'text', required: false,
      helperText: 'For S3-compatible services (e.g. Minio). Leave blank for AWS.', section: 'advanced' },
    { key: 'publicBaseUrl', label: 'Public Base URL', type: 'text', required: false,
      helperText: 'Public URL prefix for serving stored files. Optional.', section: 'advanced' },
  ],
};

// ─── Calendar provider-specific configs ──────────────────────────────────────

const ICLOUD: ProviderCredentialConfig = {
  connectionTypeLabel: 'App Password',
  helperText:
    'Generate an app-specific password at appleid.apple.com → Security → App-Specific Passwords. Your regular Apple ID password will not work.',
  basicFields: [
    { key: 'appleId',             label: 'Apple ID',              type: 'text',     required: true,  placeholder: 'you@icloud.com',           section: 'basic' },
    { key: 'appSpecificPassword', label: 'App-Specific Password', type: 'password', required: true,  placeholder: 'xxxx-xxxx-xxxx-xxxx',
      helperText: 'Format: xxxx-xxxx-xxxx-xxxx', section: 'basic' },
  ],
  advancedFields: [],
};

const GOOGLE_CALENDAR: ProviderCredentialConfig = {
  connectionTypeLabel: 'OAuth 2.0',
  helperText:
    'Create an OAuth 2.0 client in Google Cloud Console (APIs & Services → Credentials). Enable the Google Calendar API for your project.',
  basicFields: [
    { key: 'clientId',     label: 'Client ID',     type: 'text',     required: true,  placeholder: 'xxxxx.apps.googleusercontent.com', section: 'basic' },
    { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true,  section: 'basic' },
    { key: 'refreshToken', label: 'Refresh Token', type: 'password', required: true,
      helperText: 'Long-lived OAuth 2.0 refresh token. Use OAuth Playground to obtain it.', section: 'basic' },
  ],
  advancedFields: [],
};

const OUTLOOK_CALENDAR: ProviderCredentialConfig = {
  connectionTypeLabel: 'OAuth 2.0',
  helperText:
    'Register an app in Azure Active Directory (portal.azure.com → App registrations). Grant Calendars.ReadWrite permission under Microsoft Graph.',
  basicFields: [
    { key: 'tenantId',     label: 'Tenant ID',     type: 'text',     required: true,  placeholder: 'common',
      helperText: 'Azure AD tenant ID or "common" for multi-tenant apps.', section: 'basic' },
    { key: 'clientId',     label: 'Client ID',     type: 'text',     required: true,  placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', section: 'basic' },
    { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true,  section: 'basic' },
    { key: 'refreshToken', label: 'Refresh Token', type: 'password', required: true,
      helperText: 'OAuth 2.0 refresh token. Use the Microsoft identity platform authorization flow to obtain it.', section: 'basic' },
  ],
  advancedFields: [],
};

// ─── Fallback configs by connectionType ───────────────────────────────────────

const SMTP_GENERIC: ProviderCredentialConfig = {
  connectionTypeLabel: 'SMTP',
  basicFields: [
    { key: 'host', label: 'SMTP Host', type: 'text',    required: true,  placeholder: 'smtp.example.com', section: 'basic' },
    { key: 'port', label: 'Port',      type: 'number',  required: true,  defaultValue: 587, placeholder: '587', section: 'basic' },
    { key: 'user', label: 'Username',  type: 'text',    required: true,  section: 'basic' },
    { key: 'pass', label: 'Password',  type: 'password',required: true,  section: 'basic' },
  ],
  advancedFields: [
    { key: 'secure',    label: 'Use TLS (port 465)', type: 'boolean', required: false, defaultValue: false, section: 'advanced' },
    { key: 'fromName',  label: 'From Name',  type: 'text', required: false, section: 'advanced' },
    { key: 'fromEmail', label: 'From Email', type: 'text', required: false, section: 'advanced' },
  ],
};

const API_KEY_GENERIC: ProviderCredentialConfig = {
  connectionTypeLabel: 'API Key',
  basicFields: [
    { key: 'apiKey', label: 'API Key', type: 'password', required: true, section: 'basic' },
  ],
  advancedFields: [
    { key: 'fromName',  label: 'From Name',  type: 'text', required: false, section: 'advanced' },
    { key: 'fromEmail', label: 'From Email', type: 'text', required: false, section: 'advanced' },
  ],
};

const OAUTH_GENERIC: ProviderCredentialConfig = {
  connectionTypeLabel: 'OAuth 2.0',
  basicFields: [
    { key: 'clientId',     label: 'Client ID',     type: 'text',     required: true,  section: 'basic' },
    { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true,  section: 'basic' },
  ],
  advancedFields: [
    { key: 'accessToken',  label: 'Access Token',  type: 'password', required: false, section: 'advanced' },
    { key: 'refreshToken', label: 'Refresh Token', type: 'password', required: false, section: 'advanced' },
  ],
};

const ACCESS_KEYS_GENERIC: ProviderCredentialConfig = {
  connectionTypeLabel: 'Access Keys',
  basicFields: [
    { key: 'accessKeyId',     label: 'Access Key ID',     type: 'text',     required: true, section: 'basic' },
    { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true, section: 'basic' },
    { key: 'region',          label: 'Region',            type: 'text',     required: true, placeholder: 'us-east-1', section: 'basic' },
  ],
  advancedFields: [
    { key: 'bucket',   label: 'Bucket',         type: 'text', required: false, section: 'advanced' },
    { key: 'endpoint', label: 'Custom Endpoint',type: 'text', required: false, section: 'advanced' },
  ],
};

// ─── Index ────────────────────────────────────────────────────────────────────

const BY_PROVIDER_KEY: Record<string, ProviderCredentialConfig> = {
  gmail:            GMAIL,
  sendgrid:         SENDGRID,
  mailgun:          MAILGUN,
  twilio:           TWILIO,
  'aws-s3':         AWS_S3,
  s3:               AWS_S3,
  icloud:           ICLOUD,
  google_calendar:  GOOGLE_CALENDAR,
  outlook_calendar: OUTLOOK_CALENDAR,
};

const APP_PASSWORD_GENERIC: ProviderCredentialConfig = {
  connectionTypeLabel: 'App Password',
  basicFields: [
    { key: 'appleId',             label: 'Apple ID / Email',      type: 'text',     required: true,  section: 'basic' },
    { key: 'appSpecificPassword', label: 'App-Specific Password', type: 'password', required: true,  section: 'basic' },
  ],
  advancedFields: [],
};

const BY_CONNECTION_TYPE: Record<string, ProviderCredentialConfig> = {
  smtp:         SMTP_GENERIC,
  api_key:      API_KEY_GENERIC,
  oauth:        OAUTH_GENERIC,
  access_keys:  ACCESS_KEYS_GENERIC,
  app_password: APP_PASSWORD_GENERIC,
};

/**
 * Returns the credential config for a given provider or connection type.
 * Tries providerKey first (specific), then connectionType (fallback).
 */
export function getProviderCredentialConfig(
  providerKey?: string | null,
  connectionType?: string | null,
): ProviderCredentialConfig | null {
  if (providerKey) {
    const cfg = BY_PROVIDER_KEY[providerKey.toLowerCase().trim()];
    if (cfg) return cfg;
  }
  if (connectionType) {
    const cfg = BY_CONNECTION_TYPE[connectionType.toLowerCase().trim()];
    if (cfg) return cfg;
  }
  return null;
}

export const ALL_PROVIDER_KEYS = Object.keys(BY_PROVIDER_KEY);
export const ALL_CONNECTION_TYPES = Object.keys(BY_CONNECTION_TYPE);
