// src/calendar/providers/google/google-calendar.provider.ts

import { Injectable, Logger } from '@nestjs/common';

import type { ICalendarProvider } from '../../interfaces/calendar-provider.interface';
import type {
  CalendarVerifyResult,
  CalendarListResult,
  CalendarGetResult,
  CalendarCreateResult,
  CalendarUpdateResult,
  CalendarDeleteResult,
  CalendarSubscribeResult,
  CalendarInfo,
  CalendarEventInfo,
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
} from '../../types/calendar-provider.types';
import { GoogleCalendarCredentialsContract } from '../../contracts/google-credentials.contract';
import type { GoogleCalendarCredentials } from './google-credentials.types';

/**
 * GoogleCalendarProvider
 *
 * Protocol: Google Calendar API v3 (REST/JSON)
 * Auth:     OAuth 2.0 — access token refreshed via refresh_token on every call
 * Base URL: https://www.googleapis.com/calendar/v3
 */
@Injectable()
export class GoogleCalendarProvider implements ICalendarProvider {
  private readonly logger = new Logger(GoogleCalendarProvider.name);

  private static readonly API_BASE = 'https://www.googleapis.com/calendar/v3';
  private static readonly TOKEN_URL = 'https://oauth2.googleapis.com/token';

  // ─── Credential helpers ───────────────────────────────────────────────────

  private normalize(
    credentials: Record<string, any>,
  ): GoogleCalendarCredentials {
    const { value } = GoogleCalendarCredentialsContract.normalize(credentials);
    GoogleCalendarCredentialsContract.validate(value);
    return value;
  }

  private async getAccessToken(
    creds: GoogleCalendarCredentials,
  ): Promise<string> {
    const res = await fetch(GoogleCalendarProvider.TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        refresh_token: creds.refreshToken,
      }).toString(),
    });
    if (!res.ok) {
      const err: any = await res.json().catch(() => ({}));
      throw new Error(
        `Google token refresh failed: ${err.error_description ?? err.error ?? res.status}`,
      );
    }
    const data: any = await res.json();
    return data.access_token as string;
  }

  private async googleRequest(
    token: string,
    path: string,
    options?: RequestInit,
  ): Promise<any> {
    const res = await fetch(`${GoogleCalendarProvider.API_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options?.headers ?? {}),
      },
    });
    if (res.status === 204) return null;
    if (!res.ok) {
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message ?? `Google API error ${res.status}`);
    }
    return res.json();
  }

  // ─── Mappers ──────────────────────────────────────────────────────────────

  private mapCalendar(item: any): CalendarInfo {
    return {
      id: item.id,
      name: item.summary ?? '',
      description: item.description,
      color: item.colorId ?? item.backgroundColor,
      timeZone: item.timeZone,
      isReadOnly:
        item.accessRole === 'reader' || item.accessRole === 'freeBusyReader',
      isPrimary: item.primary ?? false,
      raw: item,
    };
  }

  private mapEvent(item: any, calendarId: string): CalendarEventInfo {
    const start = item.start?.dateTime ?? item.start?.date ?? '';
    const end = item.end?.dateTime ?? item.end?.date ?? '';
    return {
      id: item.id,
      calendarId,
      title: item.summary ?? '',
      description: item.description,
      location: item.location,
      startAt: start,
      endAt: end,
      allDay: !item.start?.dateTime,
      timeZone: item.start?.timeZone ?? item.timeZone,
      status: item.status,
      attendees: (item.attendees ?? []).map((a: any) => ({
        email: a.email,
        name: a.displayName,
        status: a.responseStatus,
        isOrganizer: a.organizer ?? false,
      })),
      organizerEmail: item.organizer?.email,
      uid: item.iCalUID,
      raw: item,
    };
  }

  // ─── verifyCredentials ────────────────────────────────────────────────────

  async verifyCredentials(
    credentials: Record<string, any>,
  ): Promise<CalendarVerifyResult> {
    try {
      const creds = this.normalize(credentials);
      const token = await this.getAccessToken(creds);
      await this.googleRequest(token, '/users/me/calendarList?maxResults=1');
      return { ok: true, message: 'Google Calendar connection verified' };
    } catch (err: any) {
      this.logger.error(`[Google] verifyCredentials: ${err.message}`);
      return {
        ok: false,
        message: err?.message ?? 'Google Calendar verification failed',
      };
    }
  }

  // ─── Calendar management ─────────────────────────────────────────────────

  async listCalendars(
    credentials: Record<string, any>,
  ): Promise<CalendarListResult> {
    try {
      const creds = this.normalize(credentials);
      const token = await this.getAccessToken(creds);
      const data = await this.googleRequest(token, '/users/me/calendarList');
      return {
        ok: true,
        data: (data.items ?? []).map((i: any) => this.mapCalendar(i)),
      };
    } catch (err: any) {
      this.logger.error(`[Google] listCalendars: ${err.message}`);
      return { ok: false, message: err.message };
    }
  }

  async getCalendar(
    credentials: Record<string, any>,
    calendarId: string,
  ): Promise<CalendarGetResult> {
    try {
      const creds = this.normalize(credentials);
      const token = await this.getAccessToken(creds);
      const data = await this.googleRequest(
        token,
        `/calendars/${encodeURIComponent(calendarId)}`,
      );
      return { ok: true, data: this.mapCalendar(data) };
    } catch (err: any) {
      this.logger.error(`[Google] getCalendar: ${err.message}`);
      return { ok: false, message: err.message };
    }
  }

  async createCalendar(
    credentials: Record<string, any>,
    params: CreateCalendarParams,
  ): Promise<CalendarCreateResult> {
    try {
      const creds = this.normalize(credentials);
      const token = await this.getAccessToken(creds);
      const body: any = { summary: params.name };
      if (params.description) body.description = params.description;
      if (params.timeZone) body.timeZone = params.timeZone;
      const data = await this.googleRequest(token, '/calendars', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return { ok: true, data: this.mapCalendar(data) };
    } catch (err: any) {
      this.logger.error(`[Google] createCalendar: ${err.message}`);
      return { ok: false, message: err.message };
    }
  }

  /**
   * Extracts the Google Calendar ID from a Google Calendar iCal URL.
   * URL format: https://calendar.google.com/calendar/ical/{encoded-calId}/public/basic.ics
   */
  private extractGoogleCalendarId(url: string): string | null {
    const match = url.match(/\/ical\/([^/]+)\/public\//);
    if (!match) return null;
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return null;
    }
  }

  async subscribeCalendar(
    credentials: Record<string, any>,
    params: SubscribeCalendarParams,
  ): Promise<CalendarSubscribeResult> {
    try {
      const creds = this.normalize(credentials);
      const token = await this.getAccessToken(creds);

      // For Google Calendar iCal export URLs, extract the calendar ID and use
      // CalendarList.insert to add the Google-hosted calendar to the user's list.
      // This is the correct API for Google-to-Google holiday calendar subscriptions.
      const googleCalId = this.extractGoogleCalendarId(params.url);
      if (googleCalId) {
        try {
          // CalendarList.insert: adds an existing calendar to the authenticated user's list
          const data = await this.googleRequest(
            token,
            '/users/me/calendarList',
            {
              method: 'POST',
              body: JSON.stringify({ id: googleCalId }),
            },
          );
          return { ok: true, data: this.mapCalendar(data) };
        } catch (insertErr: any) {
          // 409 = calendar already subscribed in the user's Google Calendar account.
          // Treat as idempotent success by fetching the existing entry.
          if (
            insertErr.message?.includes('409') ||
            insertErr.message?.toLowerCase().includes('already')
          ) {
            const existing = await this.googleRequest(
              token,
              `/users/me/calendarList/${encodeURIComponent(googleCalId)}`,
            );
            return { ok: true, data: this.mapCalendar(existing) };
          }
          // Surface the real Google API error for all other failures
          throw insertErr;
        }
      }

      // For non-Google iCal URLs, Google Calendar API does not support
      // subscribing to arbitrary external URLs via the REST API.
      return {
        ok: false,
        message:
          'Automatic holiday subscription is not supported by this calendar provider.',
      };
    } catch (err: any) {
      const msg = err?.message ?? 'Google Calendar subscription failed';
      this.logger.error(`[Google] subscribeCalendar: ${msg}`);
      // Return the real error so callers can surface a meaningful message
      return {
        ok: false,
        message: `Google Calendar subscription failed: ${msg}`,
      };
    }
  }

  async updateCalendar(
    credentials: Record<string, any>,
    calendarId: string,
    params: UpdateCalendarParams,
  ): Promise<CalendarUpdateResult> {
    try {
      const creds = this.normalize(credentials);
      const token = await this.getAccessToken(creds);
      const body: any = {};
      if (params.name !== undefined) body.summary = params.name;
      if (params.description !== undefined)
        body.description = params.description;
      if (params.timeZone !== undefined) body.timeZone = params.timeZone;
      const data = await this.googleRequest(
        token,
        `/calendars/${encodeURIComponent(calendarId)}`,
        { method: 'PATCH', body: JSON.stringify(body) },
      );
      return { ok: true, data: this.mapCalendar(data) };
    } catch (err: any) {
      this.logger.error(`[Google] updateCalendar: ${err.message}`);
      return { ok: false, message: err.message };
    }
  }

  async deleteCalendar(
    credentials: Record<string, any>,
    calendarId: string,
  ): Promise<CalendarDeleteResult> {
    try {
      const creds = this.normalize(credentials);
      const token = await this.getAccessToken(creds);
      await this.googleRequest(
        token,
        `/calendars/${encodeURIComponent(calendarId)}`,
        { method: 'DELETE' },
      );
      return { ok: true, data: { deleted: true } };
    } catch (err: any) {
      this.logger.error(`[Google] deleteCalendar: ${err.message}`);
      return { ok: false, message: err.message };
    }
  }

  // ─── Event management ─────────────────────────────────────────────────────

  async listEvents(
    credentials: Record<string, any>,
    calendarId: string,
    params?: ListEventsParams,
  ): Promise<EventListResult> {
    try {
      const creds = this.normalize(credentials);
      const token = await this.getAccessToken(creds);

      const qs = new URLSearchParams({
        singleEvents: 'true',
        orderBy: 'startTime',
      });
      if (params?.from) qs.set('timeMin', params.from);
      if (params?.to) qs.set('timeMax', params.to);
      if (params?.limit) qs.set('maxResults', String(params.limit));
      if (params?.pageToken) qs.set('pageToken', params.pageToken);

      const data = await this.googleRequest(
        token,
        `/calendars/${encodeURIComponent(calendarId)}/events?${qs.toString()}`,
      );

      return {
        ok: true,
        data: {
          items: (data.items ?? []).map((i: any) =>
            this.mapEvent(i, calendarId),
          ),
          nextPageToken: data.nextPageToken,
        },
      };
    } catch (err: any) {
      this.logger.error(`[Google] listEvents: ${err.message}`);
      return { ok: false, message: err.message };
    }
  }

  async getEvent(
    credentials: Record<string, any>,
    calendarId: string,
    eventId: string,
  ): Promise<EventGetResult> {
    try {
      const creds = this.normalize(credentials);
      const token = await this.getAccessToken(creds);
      const data = await this.googleRequest(
        token,
        `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      );
      return { ok: true, data: this.mapEvent(data, calendarId) };
    } catch (err: any) {
      this.logger.error(`[Google] getEvent: ${err.message}`);
      return { ok: false, message: err.message };
    }
  }

  async createEvent(
    credentials: Record<string, any>,
    calendarId: string,
    params: CreateEventParams,
  ): Promise<EventCreateResult> {
    try {
      const creds = this.normalize(credentials);
      const token = await this.getAccessToken(creds);

      const body: any = {
        summary: params.title,
        description: params.description,
        location: params.location,
        start: params.allDay
          ? { date: params.startAt.split('T')[0] }
          : { dateTime: params.startAt, timeZone: params.timeZone ?? 'UTC' },
        end: params.allDay
          ? { date: params.endAt.split('T')[0] }
          : { dateTime: params.endAt, timeZone: params.timeZone ?? 'UTC' },
      };
      if (params.attendees?.length) {
        body.attendees = params.attendees.map((a) => ({
          email: a.email,
          displayName: a.name,
        }));
      }

      const data = await this.googleRequest(
        token,
        `/calendars/${encodeURIComponent(calendarId)}/events`,
        { method: 'POST', body: JSON.stringify(body) },
      );
      return { ok: true, data: this.mapEvent(data, calendarId) };
    } catch (err: any) {
      this.logger.error(`[Google] createEvent: ${err.message}`);
      return { ok: false, message: err.message };
    }
  }

  async updateEvent(
    credentials: Record<string, any>,
    calendarId: string,
    eventId: string,
    params: UpdateEventParams,
  ): Promise<EventUpdateResult> {
    try {
      const creds = this.normalize(credentials);
      const token = await this.getAccessToken(creds);

      const body: any = {};
      if (params.title !== undefined) body.summary = params.title;
      if (params.description !== undefined)
        body.description = params.description;
      if (params.location !== undefined) body.location = params.location;

      if (params.startAt !== undefined) {
        body.start = params.allDay
          ? { date: params.startAt.split('T')[0] }
          : { dateTime: params.startAt, timeZone: params.timeZone ?? 'UTC' };
      }
      if (params.endAt !== undefined) {
        body.end = params.allDay
          ? { date: params.endAt.split('T')[0] }
          : { dateTime: params.endAt, timeZone: params.timeZone ?? 'UTC' };
      }

      const data = await this.googleRequest(
        token,
        `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        { method: 'PATCH', body: JSON.stringify(body) },
      );
      return { ok: true, data: this.mapEvent(data, calendarId) };
    } catch (err: any) {
      this.logger.error(`[Google] updateEvent: ${err.message}`);
      return { ok: false, message: err.message };
    }
  }

  async deleteEvent(
    credentials: Record<string, any>,
    calendarId: string,
    eventId: string,
  ): Promise<EventDeleteResult> {
    try {
      const creds = this.normalize(credentials);
      const token = await this.getAccessToken(creds);
      await this.googleRequest(
        token,
        `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        { method: 'DELETE' },
      );
      return { ok: true, data: { deleted: true } };
    } catch (err: any) {
      this.logger.error(`[Google] deleteEvent: ${err.message}`);
      return { ok: false, message: err.message };
    }
  }
}
