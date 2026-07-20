// src/calendar/types/calendar-provider.types.ts

export type CalendarConnectionType = 'app_password' | 'oauth';

// ─── Domain models ────────────────────────────────────────────────────────────

export interface CalendarInfo {
  id: string;
  name: string;
  description?: string;
  color?: string;
  timeZone?: string;
  isReadOnly: boolean;
  isPrimary: boolean;
  raw?: Record<string, any>;
}

export interface CalendarEventAttendee {
  email: string;
  name?: string;
  status?: 'accepted' | 'declined' | 'tentative' | 'unknown';
  isOrganizer?: boolean;
}

export interface CalendarEventInfo {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  startAt: string;   // ISO 8601
  endAt: string;     // ISO 8601
  allDay: boolean;
  timeZone?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  attendees?: CalendarEventAttendee[];
  organizerEmail?: string;
  uid?: string;      // iCal UID for stable cross-provider identification
  raw?: Record<string, any>;
}

// ─── Operation params ─────────────────────────────────────────────────────────

export interface CreateCalendarParams {
  name: string;
  description?: string;
  color?: string;
  timeZone?: string;
}

export interface UpdateCalendarParams {
  name?: string;
  description?: string;
  color?: string;
  timeZone?: string;
}

export interface SubscribeCalendarParams {
  /** iCal/ICS subscription URL or provider-specific calendar identifier. */
  url:   string;
  /** Optional display name for the subscribed calendar. */
  name?: string;
}

export type CalendarSubscribeResult = CalendarOperationResult<CalendarInfo>;

export interface CreateEventParams {
  title: string;
  description?: string;
  location?: string;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  timeZone?: string;
  attendees?: { email: string; name?: string }[];
}

export interface UpdateEventParams {
  title?: string;
  description?: string;
  location?: string;
  startAt?: string;
  endAt?: string;
  allDay?: boolean;
  timeZone?: string;
}

export interface ListEventsParams {
  from?: string;      // ISO 8601 — inclusive lower bound
  to?: string;        // ISO 8601 — inclusive upper bound
  limit?: number;
  pageToken?: string;
}

// ─── Operation results ────────────────────────────────────────────────────────

export type CalendarOperationResult<T = void> =
  | { ok: true; data: T; message?: string }
  | { ok: false; data?: never; message: string; error?: string };

export type CalendarVerifyResult = {
  ok: boolean;
  message?: string;
};

export type CalendarListResult    = CalendarOperationResult<CalendarInfo[]>;
export type CalendarGetResult     = CalendarOperationResult<CalendarInfo>;
export type CalendarCreateResult  = CalendarOperationResult<CalendarInfo>;
export type CalendarUpdateResult  = CalendarOperationResult<CalendarInfo>;
export type CalendarDeleteResult  = CalendarOperationResult<{ deleted: boolean }>;

export type EventListResult   = CalendarOperationResult<{ items: CalendarEventInfo[]; nextPageToken?: string }>;
export type EventGetResult    = CalendarOperationResult<CalendarEventInfo>;
export type EventCreateResult = CalendarOperationResult<CalendarEventInfo>;
export type EventUpdateResult = CalendarOperationResult<CalendarEventInfo>;
export type EventDeleteResult = CalendarOperationResult<{ deleted: boolean }>;
