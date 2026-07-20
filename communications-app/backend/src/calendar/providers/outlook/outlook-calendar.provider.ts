// src/calendar/providers/outlook/outlook-calendar.provider.ts

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
import { OutlookCalendarCredentialsContract } from '../../contracts/outlook-credentials.contract';
import type { OutlookCalendarCredentials } from './outlook-credentials.types';

/**
 * OutlookCalendarProvider
 *
 * Protocol: Microsoft Graph API v1.0 (REST/JSON)
 * Auth:     OAuth 2.0 — access token refreshed via refresh_token on every call
 * Base URL: https://graph.microsoft.com/v1.0
 */
@Injectable()
export class OutlookCalendarProvider implements ICalendarProvider {
  private readonly logger = new Logger(OutlookCalendarProvider.name);

  private static readonly GRAPH_BASE  = 'https://graph.microsoft.com/v1.0';
  private static readonly TOKEN_BASE  = 'https://login.microsoftonline.com';

  // ─── Credential helpers ───────────────────────────────────────────────────

  private normalize(credentials: Record<string, any>): OutlookCalendarCredentials {
    const { value } = OutlookCalendarCredentialsContract.normalize(credentials);
    OutlookCalendarCredentialsContract.validate(value);
    return value;
  }

  private async getAccessToken(creds: OutlookCalendarCredentials): Promise<string> {
    const res = await fetch(
      `${OutlookCalendarProvider.TOKEN_BASE}/${creds.tenantId}/oauth2/v2.0/token`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type:    'refresh_token',
          client_id:     creds.clientId,
          client_secret: creds.clientSecret,
          refresh_token: creds.refreshToken,
          scope:         'https://graph.microsoft.com/Calendars.ReadWrite offline_access',
        }).toString(),
      },
    );
    if (!res.ok) {
      const err: any = await res.json().catch(() => ({}));
      throw new Error(
        `Outlook token refresh failed: ${err.error_description ?? err.error ?? res.status}`,
      );
    }
    const data: any = await res.json();
    return data.access_token as string;
  }

  private async graphRequest(
    token: string,
    path: string,
    options?: RequestInit,
  ): Promise<any> {
    const res = await fetch(`${OutlookCalendarProvider.GRAPH_BASE}${path}`, {
      ...options,
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options?.headers ?? {}),
      },
    });
    if (res.status === 204) return null;
    if (!res.ok) {
      const err: any = await res.json().catch(() => ({}));
      throw new Error(
        err?.error?.message ?? `Graph API error ${res.status}`,
      );
    }
    return res.json();
  }

  // ─── Mappers ──────────────────────────────────────────────────────────────

  private mapCalendar(item: any): CalendarInfo {
    return {
      id:          item.id,
      name:        item.name ?? '',
      description: undefined,
      color:       item.hexColor ?? item.color,
      timeZone:    undefined,
      isReadOnly:  !item.canEdit,
      isPrimary:   item.isDefaultCalendar ?? false,
      raw:         item,
    };
  }

  private mapAttendeeStatus(
    response: string,
  ): 'accepted' | 'declined' | 'tentative' | 'unknown' {
    switch (String(response ?? '').toLowerCase()) {
      case 'accepted':  return 'accepted';
      case 'declined':  return 'declined';
      case 'tentative': return 'tentative';
      default:          return 'unknown';
    }
  }

  private mapEvent(item: any, calendarId: string): CalendarEventInfo {
    return {
      id:             item.id,
      calendarId,
      title:          item.subject ?? '',
      description:    item.body?.content,
      location:       item.location?.displayName,
      startAt:        item.start?.dateTime ? `${item.start.dateTime}Z` : '',
      endAt:          item.end?.dateTime   ? `${item.end.dateTime}Z`   : '',
      allDay:         item.isAllDay ?? false,
      timeZone:       item.originalStartTimeZone,
      status:         item.isCancelled ? 'cancelled' : 'confirmed',
      attendees:      (item.attendees ?? []).map((a: any) => ({
        email:       a.emailAddress?.address,
        name:        a.emailAddress?.name,
        status:      this.mapAttendeeStatus(a.status?.response),
        isOrganizer:
          a.type === 'required' &&
          item.organizer?.emailAddress?.address === a.emailAddress?.address,
      })),
      organizerEmail: item.organizer?.emailAddress?.address,
      raw:            item,
    };
  }

  // ─── verifyCredentials ────────────────────────────────────────────────────

  async verifyCredentials(credentials: Record<string, any>): Promise<CalendarVerifyResult> {
    try {
      const creds = this.normalize(credentials);
      const token = await this.getAccessToken(creds);
      await this.graphRequest(token, '/me?$select=mail,displayName');
      return { ok: true, message: 'Outlook Calendar connection verified' };
    } catch (err: any) {
      this.logger.error(`[Outlook] verifyCredentials: ${err.message}`);
      return { ok: false, message: err?.message ?? 'Outlook Calendar verification failed' };
    }
  }

  // ─── Calendar management ─────────────────────────────────────────────────

  async listCalendars(credentials: Record<string, any>): Promise<CalendarListResult> {
    try {
      const creds = this.normalize(credentials);
      const token = await this.getAccessToken(creds);
      const data  = await this.graphRequest(token, '/me/calendars');
      return { ok: true, data: (data.value ?? []).map((i: any) => this.mapCalendar(i)) };
    } catch (err: any) {
      this.logger.error(`[Outlook] listCalendars: ${err.message}`);
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
      const data  = await this.graphRequest(token, `/me/calendars/${calendarId}`);
      return { ok: true, data: this.mapCalendar(data) };
    } catch (err: any) {
      this.logger.error(`[Outlook] getCalendar: ${err.message}`);
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
      const body: any = { name: params.name };
      if (params.color) body.color = params.color;
      const data = await this.graphRequest(token, '/me/calendars', {
        method: 'POST',
        body:   JSON.stringify(body),
      });
      return { ok: true, data: this.mapCalendar(data) };
    } catch (err: any) {
      this.logger.error(`[Outlook] createCalendar: ${err.message}`);
      return { ok: false, message: err.message };
    }
  }

  async subscribeCalendar(
    _credentials: Record<string, any>,
    _params: SubscribeCalendarParams,
  ): Promise<CalendarSubscribeResult> {
    // Microsoft Graph API does not support subscribing to arbitrary iCal URLs
    // via the REST API. This operation is only available through the Outlook UI.
    return {
      ok:      false,
      message: 'Automatic holiday subscription is not supported by this calendar provider.',
    };
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
      if (params.name  !== undefined) body.name  = params.name;
      if (params.color !== undefined) body.color = params.color;
      const data = await this.graphRequest(
        token,
        `/me/calendars/${calendarId}`,
        { method: 'PATCH', body: JSON.stringify(body) },
      );
      return { ok: true, data: this.mapCalendar(data) };
    } catch (err: any) {
      this.logger.error(`[Outlook] updateCalendar: ${err.message}`);
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
      await this.graphRequest(token, `/me/calendars/${calendarId}`, { method: 'DELETE' });
      return { ok: true, data: { deleted: true } };
    } catch (err: any) {
      this.logger.error(`[Outlook] deleteCalendar: ${err.message}`);
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

      const qs = new URLSearchParams();
      if (params?.limit) qs.set('$top', String(params.limit));

      const filters: string[] = [];
      if (params?.from) filters.push(`start/dateTime ge '${params.from}'`);
      if (params?.to)   filters.push(`end/dateTime le '${params.to}'`);
      if (filters.length) qs.set('$filter', filters.join(' and '));

      if (params?.pageToken) qs.set('$skipToken', params.pageToken);

      const qsStr = qs.toString();
      const path  = `/me/calendars/${calendarId}/events${qsStr ? `?${qsStr}` : ''}`;
      const data  = await this.graphRequest(token, path);

      const nextLink: string | undefined = data['@odata.nextLink'];
      let nextPageToken: string | undefined;
      if (nextLink) {
        const skipMatch = nextLink.match(/\$skipToken=([^&]+)/);
        if (skipMatch) nextPageToken = decodeURIComponent(skipMatch[1]);
      }

      return {
        ok: true,
        data: {
          items:         (data.value ?? []).map((i: any) => this.mapEvent(i, calendarId)),
          nextPageToken,
        },
      };
    } catch (err: any) {
      this.logger.error(`[Outlook] listEvents: ${err.message}`);
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
      const data  = await this.graphRequest(token, `/me/events/${eventId}`);
      return { ok: true, data: this.mapEvent(data, calendarId) };
    } catch (err: any) {
      this.logger.error(`[Outlook] getEvent: ${err.message}`);
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
        subject:  params.title,
        body:     { contentType: 'text', content: params.description ?? '' },
        location: { displayName: params.location ?? '' },
        start:    { dateTime: params.startAt.replace('Z', ''), timeZone: params.timeZone ?? 'UTC' },
        end:      { dateTime: params.endAt.replace('Z', ''),   timeZone: params.timeZone ?? 'UTC' },
        isAllDay: params.allDay ?? false,
      };
      if (params.attendees?.length) {
        body.attendees = params.attendees.map((a) => ({
          emailAddress: { address: a.email, name: a.name ?? a.email },
          type:         'required',
        }));
      }

      const data = await this.graphRequest(
        token,
        `/me/calendars/${calendarId}/events`,
        { method: 'POST', body: JSON.stringify(body) },
      );
      return { ok: true, data: this.mapEvent(data, calendarId) };
    } catch (err: any) {
      this.logger.error(`[Outlook] createEvent: ${err.message}`);
      return { ok: false, message: err.message };
    }
  }

  async updateEvent(
    credentials: Record<string, any>,
    _calendarId: string,
    eventId: string,
    params: UpdateEventParams,
  ): Promise<EventUpdateResult> {
    try {
      const creds = this.normalize(credentials);
      const token = await this.getAccessToken(creds);

      const body: any = {};
      if (params.title       !== undefined) body.subject  = params.title;
      if (params.description !== undefined) body.body     = { contentType: 'text', content: params.description };
      if (params.location    !== undefined) body.location = { displayName: params.location };
      if (params.allDay      !== undefined) body.isAllDay = params.allDay;

      if (params.startAt !== undefined) {
        body.start = {
          dateTime: params.startAt.replace('Z', ''),
          timeZone: params.timeZone ?? 'UTC',
        };
      }
      if (params.endAt !== undefined) {
        body.end = {
          dateTime: params.endAt.replace('Z', ''),
          timeZone: params.timeZone ?? 'UTC',
        };
      }

      const data = await this.graphRequest(
        token,
        `/me/events/${eventId}`,
        { method: 'PATCH', body: JSON.stringify(body) },
      );
      return { ok: true, data: this.mapEvent(data, _calendarId) };
    } catch (err: any) {
      this.logger.error(`[Outlook] updateEvent: ${err.message}`);
      return { ok: false, message: err.message };
    }
  }

  async deleteEvent(
    credentials: Record<string, any>,
    _calendarId: string,
    eventId: string,
  ): Promise<EventDeleteResult> {
    try {
      const creds = this.normalize(credentials);
      const token = await this.getAccessToken(creds);
      await this.graphRequest(token, `/me/events/${eventId}`, { method: 'DELETE' });
      return { ok: true, data: { deleted: true } };
    } catch (err: any) {
      this.logger.error(`[Outlook] deleteEvent: ${err.message}`);
      return { ok: false, message: err.message };
    }
  }
}
