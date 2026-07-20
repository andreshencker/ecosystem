// src/calendar/providers/outlook/outlook-credentials.types.ts

/**
 * Outlook Calendar (Microsoft Graph) OAuth 2.0 credentials.
 *
 * tenantId identifies the Azure AD tenant:
 *   - 'common'       — multi-tenant personal + work accounts
 *   - 'consumers'    — personal Microsoft accounts only
 *   - '<guid>'       — specific Azure AD tenant (enterprise use)
 *
 * Token endpoint: https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
 * Graph base URL: https://graph.microsoft.com/v1.0
 * Scopes required: Calendars.ReadWrite, offline_access
 */
export interface OutlookCalendarCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  tenantId: string;
  accessToken?: string;   // refreshed at runtime; optional at save time
  expiresAt?: number;     // Unix timestamp (ms); optional at save time
}
