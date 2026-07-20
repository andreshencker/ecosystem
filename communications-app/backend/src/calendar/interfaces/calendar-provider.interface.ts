// src/calendar/interfaces/calendar-provider.interface.ts

import type {
  CalendarVerifyResult,
  CalendarListResult,
  CalendarGetResult,
  CalendarCreateResult,
  CalendarUpdateResult,
  CalendarDeleteResult,
  CalendarSubscribeResult,
  CreateCalendarParams,
  UpdateCalendarParams,
  SubscribeCalendarParams,
  EventListResult,
  EventGetResult,
  EventCreateResult,
  EventUpdateResult,
  EventDeleteResult,
  CreateEventParams,
  UpdateEventParams,
  ListEventsParams,
} from '../types/calendar-provider.types';

/**
 * ICalendarProvider
 *
 * Every Calendar provider (iCloud, Google, Outlook) must implement this
 * interface. Credentials arrive pre-decrypted via the Runtime Resolver —
 * never stored in provider state.
 *
 * All methods are stateless: credentials are passed per-call so the
 * provider classes hold no session.
 */
export interface ICalendarProvider {
  /**
   * Validate credential fields AND perform a lightweight live connectivity
   * check (token refresh, CalDAV PROPFIND, etc.).
   * Must never throw — always returns { ok, message }.
   */
  verifyCredentials(credentials: Record<string, any>): Promise<CalendarVerifyResult>;

  // ─── Calendar management ──────────────────────────────────────────────────

  listCalendars(credentials: Record<string, any>): Promise<CalendarListResult>;

  getCalendar(
    credentials: Record<string, any>,
    calendarId: string,
  ): Promise<CalendarGetResult>;

  createCalendar(
    credentials: Record<string, any>,
    params: CreateCalendarParams,
  ): Promise<CalendarCreateResult>;

  /**
   * Subscribe the provider account to an external calendar URL.
   * Optional — not all providers support this operation.
   * Implementations that do not support it must return { ok: false, message: '...' }.
   */
  subscribeCalendar?(
    credentials: Record<string, any>,
    params: SubscribeCalendarParams,
  ): Promise<CalendarSubscribeResult>;

  updateCalendar(
    credentials: Record<string, any>,
    calendarId: string,
    params: UpdateCalendarParams,
  ): Promise<CalendarUpdateResult>;

  deleteCalendar(
    credentials: Record<string, any>,
    calendarId: string,
  ): Promise<CalendarDeleteResult>;

  // ─── Event management ─────────────────────────────────────────────────────

  listEvents(
    credentials: Record<string, any>,
    calendarId: string,
    params?: ListEventsParams,
  ): Promise<EventListResult>;

  getEvent(
    credentials: Record<string, any>,
    calendarId: string,
    eventId: string,
  ): Promise<EventGetResult>;

  createEvent(
    credentials: Record<string, any>,
    calendarId: string,
    params: CreateEventParams,
  ): Promise<EventCreateResult>;

  updateEvent(
    credentials: Record<string, any>,
    calendarId: string,
    eventId: string,
    params: UpdateEventParams,
  ): Promise<EventUpdateResult>;

  deleteEvent(
    credentials: Record<string, any>,
    calendarId: string,
    eventId: string,
  ): Promise<EventDeleteResult>;
}
