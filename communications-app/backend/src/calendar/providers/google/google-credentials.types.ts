// src/calendar/providers/google/google-credentials.types.ts

/**
 * Google Calendar OAuth 2.0 credentials.
 *
 * accessToken and expiresAt are managed at runtime (refreshed automatically).
 * Only clientId, clientSecret, and refreshToken are required at configuration
 * time; the rest are updated in-memory during token refresh operations.
 *
 * Scopes required: https://www.googleapis.com/auth/calendar
 * Token endpoint: https://oauth2.googleapis.com/token
 */
export interface GoogleCalendarCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessToken?: string; // refreshed at runtime; optional at save time
  expiresAt?: number; // Unix timestamp (ms); optional at save time
}
