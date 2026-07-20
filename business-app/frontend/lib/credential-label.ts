import type { CredentialOption } from '@/types/communication-purposes';

/**
 * Maps connection type slugs to the same human-readable labels shown
 * in the Communications Credentials page "Connection" column.
 */
const CONNECTION_TYPE_LABELS: Record<string, string> = {
  smtp:         'SMTP',
  api_key:      'API Key',
  oauth:        'OAuth 2.0',
  access_keys:  'Access Keys',
  app_password: 'App Password',
};

/**
 * Formats a connection type slug into a readable label.
 * Matches the labels used by the Communications Credentials page.
 *   "smtp"         → "SMTP"
 *   "api_key"      → "API Key"
 *   "oauth"        → "OAuth 2.0"
 *   "access_keys"  → "Access Keys"
 *   "app_password" → "App Password"
 *   others         → uppercase fallback
 */
export function formatConnectionType(type: string): string {
  if (!type) return '';
  return CONNECTION_TYPE_LABELS[type.toLowerCase()] ?? type.toUpperCase();
}

/**
 * Builds the compact single-line label shown in the select trigger after selection.
 *
 * Format: tag — displayIdentifier — providerName / connectionType
 * Examples (all fields):
 *   general — grapiflyvideo@gmail.com — Gmail / SMTP
 *   marketing — marketing@company.com — SendGrid / API
 *   support — +61400000000 — Twilio / API
 *
 * Fallbacks (missing optional parts):
 *   general — Gmail / SMTP     (no displayIdentifier)
 *   general — SMTP             (no providerDisplayName/providerKey)
 *   general                    (no provider or connection info at all)
 */
export function buildCredentialSelectLabel(opt: CredentialOption): string {
  const tag = opt.tag || 'unknown';
  const identifier = opt.displayIdentifier?.trim() || '';
  const providerName = opt.providerDisplayName?.trim() || opt.providerKey?.trim() || '';
  const connType = formatConnectionType(opt.connectionType);

  const providerPart = [providerName, connType].filter(Boolean).join(' / ');
  const parts = [tag, identifier, providerPart].filter(Boolean);
  return parts.join(' — ');
}

/**
 * Builds the secondary line shown in the dropdown item below the tag.
 *
 * When a displayIdentifier is present:
 *   grapiflyvideo@gmail.com — Gmail · SMTP
 *
 * Without displayIdentifier:
 *   Gmail · SMTP
 *
 * Without any provider info:
 *   grapiflyvideo@gmail.com    (or '')
 */
export function buildCredentialMetaLine(opt: CredentialOption): string {
  const identifier = opt.displayIdentifier?.trim() || '';
  const providerName = opt.providerDisplayName?.trim() || opt.providerKey?.trim() || '';
  const connType = formatConnectionType(opt.connectionType);
  const providerPart = [providerName, connType].filter(Boolean).join(' · ');

  return [identifier, providerPart].filter(Boolean).join(' — ');
}
