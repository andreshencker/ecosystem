// ─── Calendar connection (ProviderCredentials for channel='calendar') ─────────

export interface CalendarConnection {
  id: string;
  tag: string;
  displayIdentifier?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  companyChannelProvider?: {
    id: string;
    isDefault: boolean;
    provider?: {
      providerKey: string;
      displayName: string;
      connectionType: string;
    };
    channel?: {
      channelKey: string;
      displayName: string;
    };
  };
}

export interface CalendarConnectionsPage {
  data: CalendarConnection[];
  total: number;
  limit: number;
  offset: number;
}

// ─── Calendar resource ────────────────────────────────────────────────────────

export interface CalendarInfo {
  id: string;
  name: string;
  description?: string;
  color?: string;
  timeZone?: string;
  isReadOnly: boolean;
  isPrimary: boolean;
}

// ─── Calendar event ───────────────────────────────────────────────────────────

export interface CalendarEventAttendee {
  email: string;
  name?: string;
  status?: 'accepted' | 'declined' | 'tentative' | 'unknown';
  isOrganizer?: boolean;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  timeZone?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  attendees?: CalendarEventAttendee[];
  organizerEmail?: string;
  uid?: string;
}

export interface CalendarEventsPage {
  items: CalendarEvent[];
  nextPageToken?: string;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface ConnectCalendarDto {
  providerKey: 'google_calendar' | 'outlook_calendar' | 'icloud';
  tag?: string;
  credentials: Record<string, string>;
}

export interface CreateCalendarDto {
  name: string;
  description?: string;
  color?: string;
  timeZone?: string;
}

export interface UpdateCalendarDto {
  name?: string;
  description?: string;
  color?: string;
  timeZone?: string;
}

export interface CreateEventDto {
  title: string;
  description?: string;
  location?: string;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  timeZone?: string;
  attendees?: { email: string; name?: string }[];
}

export interface UpdateEventDto {
  title?: string;
  description?: string;
  location?: string;
  startAt?: string;
  endAt?: string;
  allDay?: boolean;
  timeZone?: string;
}

export interface ListEventsQuery {
  from?: string;
  to?: string;
  limit?: number;
  pageToken?: string;
}

// ─── Test result ──────────────────────────────────────────────────────────────

export interface CalendarTestResult {
  ok: boolean;
  message?: string;
}

// ─── Provider field definitions (UI-side config) ──────────────────────────────

export interface ProviderField {
  key: string;
  label: string;
  type: 'text' | 'password';
  required: boolean;
  placeholder?: string;
  hint?: string;
}

export interface CalendarProviderConfig {
  providerKey: 'google_calendar' | 'outlook_calendar' | 'icloud';
  displayName: string;
  connectionType: string;
  fields: ProviderField[];
}

export const CALENDAR_PROVIDERS: CalendarProviderConfig[] = [
  {
    providerKey:    'google_calendar',
    displayName:    'Google Calendar',
    connectionType: 'oauth',
    fields: [
      { key: 'clientId',     label: 'Client ID',      type: 'text',     required: true,  hint: 'Google OAuth 2.0 Client ID' },
      { key: 'clientSecret', label: 'Client Secret',  type: 'password', required: true,  hint: 'Google OAuth 2.0 Client Secret' },
      { key: 'refreshToken', label: 'Refresh Token',  type: 'password', required: true,  hint: 'OAuth 2.0 Refresh Token (long-lived)' },
    ],
  },
  {
    providerKey:    'outlook_calendar',
    displayName:    'Outlook Calendar',
    connectionType: 'oauth',
    fields: [
      { key: 'tenantId',     label: 'Tenant ID',      type: 'text',     required: true,  placeholder: 'common',  hint: 'Azure AD Tenant ID or "common"' },
      { key: 'clientId',     label: 'Client ID',      type: 'text',     required: true,  hint: 'Azure App Client ID' },
      { key: 'clientSecret', label: 'Client Secret',  type: 'password', required: true,  hint: 'Azure App Client Secret' },
      { key: 'refreshToken', label: 'Refresh Token',  type: 'password', required: true,  hint: 'OAuth 2.0 Refresh Token' },
    ],
  },
  {
    providerKey:    'icloud',
    displayName:    'iCloud Calendar',
    connectionType: 'app_password',
    fields: [
      { key: 'appleId',             label: 'Apple ID',            type: 'text',     required: true,  placeholder: 'you@icloud.com' },
      { key: 'appSpecificPassword', label: 'App-Specific Password', type: 'password', required: true, hint: 'Generate at appleid.apple.com — format: xxxx-xxxx-xxxx-xxxx' },
    ],
  },
];

export function getProviderConfig(providerKey: string): CalendarProviderConfig | undefined {
  return CALENDAR_PROVIDERS.find((p) => p.providerKey === providerKey);
}
