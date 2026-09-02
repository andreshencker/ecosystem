// src/calendar/providers/icloud/icloud-calendar.provider.ts

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
import { ICloudCredentialsContract } from '../../contracts/icloud-credentials.contract';
import type { ICloudCredentials } from './icloud-credentials.types';
import {
  basicAuthHeader,
  buildPropfindBody,
  buildCalendarQueryBody,
  buildMkCalendarBody,
  buildMkSubscribedCalendarBody,
  buildProppatchBody,
  extractPropValue,
  extractHrefFromProp,
  resolveHref,
  parseMultistatusResponses,
  parseVEvents,
  expandVEventsInRange,
  extractCalendarTimezone,
  buildVEvent,
  generateUID,
} from '../../utils/caldav.util';

/**
 * ICloudCalendarProvider
 *
 * Protocol: CalDAV (RFC 4791) over HTTPS
 * Auth:     HTTP Basic — appleId + appSpecificPassword
 * Base URL: https://caldav.icloud.com
 */
@Injectable()
export class ICloudCalendarProvider implements ICalendarProvider {
  private readonly logger = new Logger(ICloudCalendarProvider.name);

  private static readonly CALDAV_BASE = 'https://caldav.icloud.com';

  // ─── Credential helpers ───────────────────────────────────────────────────

  private normalize(credentials: Record<string, any>): ICloudCredentials {
    const { value } = ICloudCredentialsContract.normalize(credentials);
    ICloudCredentialsContract.validate(value);
    return value;
  }

  private authHeader(creds: ICloudCredentials): string {
    return basicAuthHeader(creds.appleId, creds.appSpecificPassword);
  }

  // ─── Low-level CalDAV request ─────────────────────────────────────────────

  private async caldavRequest(
    url: string,
    method: string,
    auth: string,
    options: { body?: string; contentType?: string; depth?: string } = {},
  ): Promise<{ status: number; text: string; headers: Headers }> {
    const headers: Record<string, string> = {
      Authorization: auth,
      'User-Agent': 'Grapifly/1.0',
    };
    if (options.contentType) headers['Content-Type'] = options.contentType;
    if (options.depth !== undefined) headers['Depth'] = options.depth;

    const res = await fetch(url, {
      method,
      headers,
      body: options.body,
      redirect: 'follow',
    });
    const text = await res.text();
    return { status: res.status, text, headers: res.headers };
  }

  // ─── CalDAV discovery ─────────────────────────────────────────────────────

  private async discoverCalendarHome(
    creds: ICloudCredentials,
  ): Promise<string> {
    const auth = this.authHeader(creds);

    // Step 1: PROPFIND to /.well-known/caldav → get current-user-principal
    const { text: principalXml } = await this.caldavRequest(
      `${ICloudCalendarProvider.CALDAV_BASE}/.well-known/caldav`,
      'PROPFIND',
      auth,
      {
        depth: '0',
        contentType: 'application/xml; charset=utf-8',
        body: buildPropfindBody(['<D:current-user-principal/>']),
      },
    );

    // Use the XML-aware extractor so relative hrefs inside <current-user-principal>
    // are parsed correctly (Apple returns relative paths, not absolute URLs).
    const principalHref = extractHrefFromProp(
      principalXml,
      'current-user-principal',
    );
    if (!principalHref) {
      throw new Error('Could not discover CalDAV principal URL');
    }
    const principalUrl = resolveHref(
      principalHref,
      ICloudCalendarProvider.CALDAV_BASE,
    );

    // Step 2: PROPFIND on principal → get calendar-home-set
    const { text: homeXml } = await this.caldavRequest(
      principalUrl,
      'PROPFIND',
      auth,
      {
        depth: '0',
        contentType: 'application/xml; charset=utf-8',
        body: buildPropfindBody(['<C:calendar-home-set/>']),
      },
    );

    const homeHref = extractHrefFromProp(homeXml, 'calendar-home-set');
    if (!homeHref) {
      throw new Error('Could not discover calendar-home-set URL');
    }
    const homeUrl = resolveHref(homeHref, ICloudCalendarProvider.CALDAV_BASE);

    return homeUrl;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private resolveCalUrl(calendarId: string): string {
    return calendarId.startsWith('http')
      ? calendarId
      : `${ICloudCalendarProvider.CALDAV_BASE}${calendarId}`;
  }

  private parseCalendarFromProps(
    href: string,
    props: string,
  ): CalendarInfo | null {
    const name = extractPropValue(props, 'displayname');
    if (!name) return null;

    const compSet = extractPropValue(props, 'supported-calendar-component-set');
    if (compSet && !compSet.includes('VEVENT')) return null;

    const fullUrl = href.startsWith('http')
      ? href
      : `${ICloudCalendarProvider.CALDAV_BASE}${href}`;

    // Extract TZID from the C:calendar-timezone VTIMEZONE block when present.
    // iCloud CalDAV includes this for calendars that have a timezone set.
    const calTzProp = extractPropValue(props, 'calendar-timezone');
    const calTzMatch = calTzProp ? calTzProp.match(/TZID:([^\r\n:]+)/) : null;
    const timeZone = calTzMatch ? calTzMatch[1].trim() : undefined;

    return {
      id: fullUrl,
      name,
      description: extractPropValue(props, 'calendar-description') || undefined,
      color: extractPropValue(props, 'calendar-color') || undefined,
      timeZone,
      isReadOnly: false,
      isPrimary: name.toLowerCase() === 'home',
    };
  }

  // ─── verifyCredentials ────────────────────────────────────────────────────

  async verifyCredentials(
    credentials: Record<string, any>,
  ): Promise<CalendarVerifyResult> {
    try {
      const creds = this.normalize(credentials);
      await this.discoverCalendarHome(creds);
      return { ok: true, message: 'iCloud CalDAV connection verified' };
    } catch (err: any) {
      this.logger.error(`[iCloud] verifyCredentials: ${err.message}`);
      return {
        ok: false,
        message: err?.message ?? 'iCloud verification failed',
      };
    }
  }

  // ─── Calendar management ─────────────────────────────────────────────────

  async listCalendars(
    credentials: Record<string, any>,
  ): Promise<CalendarListResult> {
    try {
      const creds = this.normalize(credentials);
      const homeUrl = await this.discoverCalendarHome(creds);
      const auth = this.authHeader(creds);

      const { text } = await this.caldavRequest(homeUrl, 'PROPFIND', auth, {
        depth: '1',
        contentType: 'application/xml; charset=utf-8',
        body: buildPropfindBody([
          '<D:displayname/>',
          '<D:resourcetype/>',
          '<C:calendar-description/>',
          '<A:calendar-color xmlns:A="http://apple.com/ns/ical/"/>',
          '<C:supported-calendar-component-set/>',
        ]),
      });

      const responses = parseMultistatusResponses(text);
      const homePath = new URL(homeUrl).pathname;
      const calendars: CalendarInfo[] = [];

      for (const { href, props } of responses) {
        // Skip the home collection itself
        const hrefPath = href.startsWith('http')
          ? new URL(href).pathname
          : href;
        if (hrefPath === homePath || hrefPath === homePath.replace(/\/$/, ''))
          continue;

        const cal = this.parseCalendarFromProps(href, props);
        if (cal) calendars.push(cal);
      }

      return { ok: true, data: calendars };
    } catch (err: any) {
      this.logger.error(`[iCloud] listCalendars: ${err.message}`);
      return { ok: false, message: err.message };
    }
  }

  async getCalendar(
    credentials: Record<string, any>,
    calendarId: string,
  ): Promise<CalendarGetResult> {
    try {
      const creds = this.normalize(credentials);
      const auth = this.authHeader(creds);
      const calUrl = this.resolveCalUrl(calendarId);

      const { text } = await this.caldavRequest(calUrl, 'PROPFIND', auth, {
        depth: '0',
        contentType: 'application/xml; charset=utf-8',
        body: buildPropfindBody([
          '<D:displayname/>',
          '<D:resourcetype/>',
          '<C:calendar-description/>',
          '<A:calendar-color xmlns:A="http://apple.com/ns/ical/"/>',
          '<C:supported-calendar-component-set/>',
        ]),
      });

      const responses = parseMultistatusResponses(text);
      if (responses.length === 0) {
        return { ok: false, message: 'Calendar not found' };
      }
      const { href, props } = responses[0];
      const cal = this.parseCalendarFromProps(href || calUrl, props);
      if (!cal) {
        return { ok: false, message: 'Could not parse calendar data' };
      }
      return { ok: true, data: cal };
    } catch (err: any) {
      this.logger.error(`[iCloud] getCalendar: ${err.message}`);
      return { ok: false, message: err.message };
    }
  }

  async createCalendar(
    credentials: Record<string, any>,
    params: CreateCalendarParams,
  ): Promise<CalendarCreateResult> {
    try {
      const creds = this.normalize(credentials);
      const homeUrl = await this.discoverCalendarHome(creds);
      const auth = this.authHeader(creds);

      const uid = generateUID().replace('@grapifly.com', '');
      const calUrl = `${homeUrl.replace(/\/$/, '')}/${uid}/`;

      const { status } = await this.caldavRequest(calUrl, 'MKCALENDAR', auth, {
        contentType: 'application/xml; charset=utf-8',
        body: buildMkCalendarBody(
          params.name,
          params.description,
          params.color,
        ),
      });

      if (status >= 400) {
        throw new Error(`MKCALENDAR failed with status ${status}`);
      }

      return {
        ok: true,
        data: {
          id: calUrl,
          name: params.name,
          description: params.description,
          color: params.color,
          timeZone: params.timeZone,
          isReadOnly: false,
          isPrimary: false,
        },
      };
    } catch (err: any) {
      this.logger.error(`[iCloud] createCalendar: ${err.message}`);
      return { ok: false, message: err.message };
    }
  }

  async subscribeCalendar(
    credentials: Record<string, any>,
    params: SubscribeCalendarParams,
  ): Promise<CalendarSubscribeResult> {
    try {
      const creds = this.normalize(credentials);
      const homeUrl = await this.discoverCalendarHome(creds);
      const auth = this.authHeader(creds);

      const uid = generateUID().replace('@grapifly.com', '');
      const calUrl = `${homeUrl.replace(/\/$/, '')}/${uid}/`;

      // Use MKCALENDAR with CS:source to create a subscribed calendar (Apple extension)
      const { status } = await this.caldavRequest(calUrl, 'MKCALENDAR', auth, {
        contentType: 'application/xml; charset=utf-8',
        body: buildMkSubscribedCalendarBody(
          params.name ?? 'Australian Public Holidays',
          params.url,
        ),
      });

      if (status >= 400) {
        this.logger.warn(
          `[iCloud] subscribeCalendar: MKCALENDAR with CS:source failed HTTP ${status} — ` +
            `this iCloud account may not support URL subscriptions via CalDAV API.`,
        );
        return {
          ok: false,
          message:
            'Automatic holiday subscription is not supported by this calendar provider.',
        };
      }

      return {
        ok: true,
        data: {
          id: calUrl,
          name: params.name ?? 'Australian Public Holidays',
          isReadOnly: true,
          isPrimary: false,
        },
      };
    } catch (err: any) {
      this.logger.error(`[iCloud] subscribeCalendar: ${err.message}`);
      return {
        ok: false,
        message:
          'Automatic holiday subscription is not supported by this calendar provider.',
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
      const auth = this.authHeader(creds);
      const calUrl = this.resolveCalUrl(calendarId);

      const propsToSet: Record<string, string> = {};
      if (params.name !== undefined) propsToSet['D:displayname'] = params.name;
      if (params.description !== undefined)
        propsToSet['C:calendar-description'] = params.description;
      if (params.color !== undefined)
        propsToSet['A:calendar-color xmlns:A="http://apple.com/ns/ical/"'] =
          params.color;

      if (Object.keys(propsToSet).length === 0) {
        // Nothing to update — fetch and return current
        return this.getCalendar(
          credentials,
          calendarId,
        ) as Promise<CalendarUpdateResult>;
      }

      const { status } = await this.caldavRequest(calUrl, 'PROPPATCH', auth, {
        contentType: 'application/xml; charset=utf-8',
        body: buildProppatchBody(propsToSet),
      });

      if (status >= 400) {
        throw new Error(`PROPPATCH failed with status ${status}`);
      }

      // Fetch the updated calendar
      return this.getCalendar(
        credentials,
        calendarId,
      ) as Promise<CalendarUpdateResult>;
    } catch (err: any) {
      this.logger.error(`[iCloud] updateCalendar: ${err.message}`);
      return { ok: false, message: err.message };
    }
  }

  async deleteCalendar(
    credentials: Record<string, any>,
    calendarId: string,
  ): Promise<CalendarDeleteResult> {
    try {
      const creds = this.normalize(credentials);
      const auth = this.authHeader(creds);
      const calUrl = this.resolveCalUrl(calendarId);

      const { status } = await this.caldavRequest(calUrl, 'DELETE', auth);
      if (status >= 400) {
        throw new Error(`DELETE calendar failed with status ${status}`);
      }
      return { ok: true, data: { deleted: true } };
    } catch (err: any) {
      this.logger.error(`[iCloud] deleteCalendar: ${err.message}`);
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
      const auth = this.authHeader(creds);
      const calUrl = this.resolveCalUrl(calendarId);

      // ── 1. Log the resolved calendar URL ────────────────────────────────
      this.logger.log(
        `[iCloud/listEvents] calendarId decoded → calUrl="${calUrl}"`,
      );

      // ── 2. Default date range: ±12 months when none is supplied ─────────
      const now = new Date();
      const fromDate =
        params?.from ??
        new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate(),
        ).toISOString();
      const toDate =
        params?.to ??
        new Date(
          now.getFullYear() + 1,
          now.getMonth(),
          now.getDate(),
        ).toISOString();
      const fromMs = new Date(fromDate).getTime();
      const toMs = new Date(toDate).getTime();

      this.logger.log(
        `[iCloud/listEvents] time-range: from="${fromDate}" to="${toDate}"` +
          (params?.from ? '' : ' (from=DEFAULT)') +
          (params?.to ? '' : ' (to=DEFAULT)'),
      );

      // ── 3. PROPFIND Depth:0 — detect calendar type ───────────────────────
      // Subscribed calendars (added via webcal:// URL) expose a <CS:source>
      // element and contain NO events in the CalDAV collection itself — iCloud
      // syncs the events only to local Apple Calendar but never stores them
      // in the CalDAV account.  We must fetch from the source feed directly.
      let sourceUrl: string | null = null;
      let isSubscribed = false;

      try {
        const { status: propStatus, text: propText } = await this.caldavRequest(
          calUrl,
          'PROPFIND',
          auth,
          {
            depth: '0',
            contentType: 'application/xml; charset=utf-8',
            body: buildPropfindBody([
              '<D:resourcetype/>',
              '<D:displayname/>',
              '<CS:source xmlns:CS="http://calendarserver.org/ns/"/>',
              '<D:current-user-privilege-set/>',
            ]),
          },
        );

        this.logger.log(
          `[iCloud/listEvents] PROPFIND Depth:0 → HTTP ${propStatus}\n` +
            `  Body (first 2000 chars):\n${propText.slice(0, 2000)}`,
        );

        if (propStatus < 400) {
          const resourcetype = extractPropValue(propText, 'resourcetype');
          isSubscribed = resourcetype.includes('subscribed-calendar');

          // Extract webcal:// source href via nested <D:href> inside <CS:source>
          const rawSourceHref = extractHrefFromProp(propText, 'source');
          if (rawSourceHref) {
            // webcal:// is identical to https:// — replace the scheme
            sourceUrl = rawSourceHref.replace(/^webcal:\/\//i, 'https://');
            this.logger.log(
              `[iCloud/listEvents] Calendar has <CS:source> → subscribed feed detected.\n` +
                `  isSubscribed marker in resourcetype: ${isSubscribed}\n` +
                `  source URL (scheme sanitised): ${sourceUrl.replace(/token=[^&]+/, 'token=REDACTED')}`,
            );
          }

          const privs = extractPropValue(
            propText,
            'current-user-privilege-set',
          );
          this.logger.log(
            `[iCloud/listEvents] resourcetype: "${resourcetype.replace(/\s+/g, ' ').trim()}"\n` +
              `  has write : ${privs.includes('write')}\n` +
              `  has read  : ${privs.includes('read') || privs.includes('read-current-user-privilege-set')}`,
          );
        }
      } catch (probeErr: any) {
        this.logger.warn(
          `[iCloud/listEvents] PROPFIND probe failed: ${probeErr.message}`,
        );
      }

      // ── 4a. SUBSCRIBED CALENDAR — fetch the external iCal feed ──────────
      if (sourceUrl) {
        this.logger.log(
          `[iCloud/listEvents] Taking SUBSCRIBED path — GET from external iCal feed.`,
        );

        const feedRes = await fetch(sourceUrl, {
          headers: { 'User-Agent': 'Grapifly/1.0' },
          redirect: 'follow',
        });
        const feedText = await feedRes.text();

        this.logger.log(
          `[iCloud/listEvents] External feed response: HTTP ${feedRes.status}  ` +
            `bytes=${feedText.length}`,
        );
        this.logger.debug(
          `[iCloud/listEvents] Feed body (first 3000 chars):\n${feedText.slice(0, 3000)}`,
        );

        if (!feedRes.ok) {
          return {
            ok: false,
            message: `External calendar feed returned HTTP ${feedRes.status}`,
          };
        }

        // Extract the calendar-level timezone from the feed (X-WR-TIMEZONE or VTIMEZONE TZID).
        // [CALDAV_TIMEZONE_FIX_RUNTIME_V1] — runtime marker confirming the updated code is active.
        // If this line appears in the logs, the timezone fix is running.
        this.logger.log(
          `[CALDAV_TIMEZONE_FIX_RUNTIME_V1] SUBSCRIBED path entered for calendarId=${calendarId.slice(0, 40)}`,
        );

        // This is the authoritative timezone for feeds that export UTC-Z timestamps without
        // per-event TZID parameters (e.g. LASSO, Airtable, many SaaS scheduling platforms).
        const calendarTz = extractCalendarTimezone(feedText);
        if (calendarTz) {
          this.logger.log(
            `[iCloud/listEvents] SUBSCRIBED: calendar-level timezone detected → "${calendarTz}"`,
          );
        } else {
          this.logger.warn(
            `[iCloud/listEvents] SUBSCRIBED: no X-WR-TIMEZONE / VTIMEZONE in feed — ` +
              `UTC-Z events without per-event TZID will be stored as UTC. feedText first 500: ${feedText.slice(0, 500).replace(/\n/g, '|')}`,
          );
        }

        // Parse the entire feed then expand recurring events within the date range
        const allParsed = parseVEvents(feedText);
        this.logger.log(
          `[iCloud/listEvents] Feed VEVENTs parsed: ${allParsed.length}`,
        );

        // Log any RRULE-bearing events found in the feed
        const masterEvents = allParsed.filter(
          (e) => e.rrule && !e.recurrenceId,
        );
        if (masterEvents.length > 0) {
          for (const me of masterEvents) {
            this.logger.log(
              `[iCloud/listEvents] RRULE detected — uid="${me.uid}" ` +
                `summary="${me.summary}" dtstart="${me.dtstart}" rrule="${me.rrule}"`,
            );
          }
        }

        const expanded = expandVEventsInRange(
          allParsed,
          new Date(fromDate),
          new Date(toDate),
          calendarTz,
        );

        // Log expansion results for recurring events
        const recurringExpanded = expanded.filter((e) => e.isRecurring);
        if (recurringExpanded.length > 0) {
          this.logger.log(
            `[iCloud/listEvents] RRULE expansion results:\n` +
              `  occurrences generated : ${recurringExpanded.length}\n` +
              `  first occurrence      : ${recurringExpanded[0]?.dtstart ?? '—'}\n` +
              `  last occurrence       : ${recurringExpanded[recurringExpanded.length - 1]?.dtstart ?? '—'}`,
          );
        }

        const events: CalendarEventInfo[] = expanded.map((ev) => ({
          id: ev.occurrenceId || `${calendarId}/${ev.dtstart}`,
          calendarId,
          title: ev.summary || '(no title)',
          description: ev.description || undefined,
          location: ev.location || undefined,
          startAt: ev.dtstart,
          endAt: ev.dtend || ev.dtstart,
          allDay: !ev.dtstart.includes('T'),
          // ev.timeZone is already set by expandVEventsInRange using calendarTz as fallback.
          // Belt-and-suspenders: apply calendarTz here too in case ev.timeZone was not set.
          timeZone: ev.timeZone || calendarTz || undefined,
          uid: ev.uid,
          status: ev.status as any,
        }));

        this.logger.log(
          `[iCloud/listEvents] SUBSCRIBED SUMMARY:\n` +
            `  feed VEVENTs total    : ${allParsed.length}\n` +
            `  after RRULE expansion : ${expanded.length}\n` +
            `  total events returned : ${events.length}`,
        );

        if (params?.limit) events.splice(params.limit);
        return { ok: true, data: { items: events } };
      }

      // ── 4b. OWNED / DELEGATED — CalDAV REPORT ───────────────────────────
      const reportBody = buildCalendarQueryBody(fromDate, toDate);
      this.logger.debug(
        `[iCloud/listEvents] REPORT request:\n` +
          `  URL   : ${calUrl}\n` +
          `  Depth : 1\n` +
          `  Body  :\n${reportBody}`,
      );

      const { status, text } = await this.caldavRequest(
        calUrl,
        'REPORT',
        auth,
        {
          depth: '1',
          contentType: 'application/xml; charset=utf-8',
          body: reportBody,
        },
      );

      this.logger.log(`[iCloud/listEvents] REPORT response status: ${status}`);

      if (status >= 400) {
        this.logger.error(
          `[iCloud/listEvents] REPORT failed (${status}).\n${text.slice(0, 1000)}`,
        );
        return { ok: false, message: `CalDAV REPORT returned HTTP ${status}` };
      }

      this.logger.debug(
        `[iCloud/listEvents] Raw multistatus (first 3000 chars):\n${text.slice(0, 3000)}`,
      );

      const responses = parseMultistatusResponses(text);
      const events: CalendarEventInfo[] = [];
      let resourcesWithData = 0;
      let totalParsed = 0;
      let totalExpanded = 0;
      let totalSkipped = 0;

      this.logger.log(
        `[iCloud/listEvents] Multistatus blocks: ${responses.length}`,
      );

      for (let i = 0; i < responses.length; i++) {
        const { href, props } = responses[i];
        const icalData = extractPropValue(props, 'calendar-data');

        if (!icalData) {
          this.logger.debug(
            `[iCloud/listEvents] resource[${i}] href="${href}" — no calendar-data ` +
              `(propstat: "${extractPropValue(props, 'status')}")`,
          );
          continue;
        }

        resourcesWithData++;
        const parsed = parseVEvents(icalData);
        totalParsed += parsed.length;

        if (parsed.length === 0) {
          this.logger.warn(
            `[iCloud/listEvents] resource[${i}] href="${href}" — 0 VEVENTs parsed.\n` +
              `  iCal (first 500):\n${icalData.slice(0, 500)}`,
          );
          continue;
        }

        // Log RRULE detection for this resource
        const masters = parsed.filter((e) => e.rrule && !e.recurrenceId);
        for (const me of masters) {
          this.logger.log(
            `[iCloud/listEvents] RRULE detected — resource[${i}] uid="${me.uid}" ` +
              `summary="${me.summary}" rrule="${me.rrule}"`,
          );
        }

        // [CALDAV_TIMEZONE_FIX_RUNTIME_V1] — REPORT path event (not subscribed).
        // Extract calendar-level timezone from this resource's VCALENDAR block.
        // Owned iCloud calendars use DTSTART;TZID= so calResTz is usually null here,
        // but this handles edge cases where the TZID is missing.
        const calResTz = extractCalendarTimezone(icalData);
        if (i === 0) {
          this.logger.log(
            `[CALDAV_TIMEZONE_FIX_RUNTIME_V1] REPORT resource[0] calResTz="${calResTz ?? 'null'}" icalData[0..200]=${icalData.slice(0, 200).replace(/\n/g, '|')}`,
          );
        }

        // Expand recurring events within the requested range
        const expanded = expandVEventsInRange(
          parsed,
          new Date(fromDate),
          new Date(toDate),
          calResTz,
        );
        totalExpanded += expanded.length;

        if (masters.length > 0) {
          const recurExpanded = expanded.filter((e) => e.isRecurring);
          this.logger.log(
            `[iCloud/listEvents] resource[${i}] RRULE expansion:\n` +
              `  occurrences generated : ${recurExpanded.length}\n` +
              `  first occurrence      : ${recurExpanded[0]?.dtstart ?? '—'}\n` +
              `  last occurrence       : ${recurExpanded[recurExpanded.length - 1]?.dtstart ?? '—'}`,
          );
        }

        for (const ev of expanded) {
          if (!ev.dtstart) {
            totalSkipped++;
            this.logger.warn(
              `[iCloud/listEvents] Skipping uid="${ev.uid}" — dtstart empty.`,
            );
            continue;
          }

          this.logger.debug(
            `[iCloud/listEvents] event uid="${ev.uid}" summary="${ev.summary}" ` +
              `dtstart="${ev.dtstart}" recurring="${ev.isRecurring}"`,
          );

          events.push({
            id: ev.occurrenceId || href,
            calendarId,
            title: ev.summary || '(no title)',
            description: ev.description || undefined,
            location: ev.location || undefined,
            startAt: ev.dtstart,
            endAt: ev.dtend || ev.dtstart,
            allDay: !ev.dtstart.includes('T'),
            // calResTz is the calendar-level timezone from this resource's VCALENDAR block.
            // Use it as a fallback when the event has no per-event TZID.
            timeZone: ev.timeZone || calResTz || undefined,
            uid: ev.uid,
            status: ev.status as any,
          });
        }
      }

      this.logger.log(
        `[iCloud/listEvents] REPORT SUMMARY:\n` +
          `  <response> blocks    : ${responses.length}\n` +
          `  with calendar-data   : ${resourcesWithData}\n` +
          `  VEVENTs parsed       : ${totalParsed}\n` +
          `  after RRULE expansion: ${totalExpanded}\n` +
          `  VEVENTs skipped      : ${totalSkipped}\n` +
          `  total events returned: ${events.length}`,
      );

      if (responses.length === 0) {
        this.logger.warn(
          `[iCloud/listEvents] iCloud returned 0 resources. ` +
            `If this is a subscribed/external calendar the <CS:source> PROPFIND ` +
            `returned nothing — check the PROPFIND log above.`,
        );
      }

      if (params?.limit) events.splice(params.limit);
      return { ok: true, data: { items: events } };
    } catch (err: any) {
      this.logger.error(`[iCloud] listEvents: ${err.message}`, err?.stack);
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
      const auth = this.authHeader(creds);
      const eventUrl = this.resolveCalUrl(eventId);

      const { status, text } = await this.caldavRequest(eventUrl, 'GET', auth);
      if (status >= 400) {
        throw new Error(`GET event failed with status ${status}`);
      }

      const parsed = parseVEvents(text);
      if (parsed.length === 0) {
        return { ok: false, message: 'Event not found or could not be parsed' };
      }
      const ev = parsed[0];

      return {
        ok: true,
        data: {
          id: eventUrl,
          calendarId,
          title: ev.summary,
          description: ev.description || undefined,
          location: ev.location || undefined,
          startAt: ev.dtstart,
          endAt: ev.dtend,
          allDay: !ev.dtstart.includes('T'),
          uid: ev.uid,
          status: ev.status as any,
        },
      };
    } catch (err: any) {
      this.logger.error(`[iCloud] getEvent: ${err.message}`);
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
      const auth = this.authHeader(creds);
      const uid = generateUID();
      const calUrl = this.resolveCalUrl(calendarId);
      const eventUrl = `${calUrl.replace(/\/$/, '')}/${uid}.ics`;
      const ical = buildVEvent({ uid, ...params });

      const { status } = await this.caldavRequest(eventUrl, 'PUT', auth, {
        contentType: 'text/calendar; charset=utf-8',
        body: ical,
      });

      if (status >= 400) {
        throw new Error(`CalDAV PUT failed with status ${status}`);
      }

      return {
        ok: true,
        data: {
          id: eventUrl,
          calendarId,
          title: params.title,
          description: params.description,
          location: params.location,
          startAt: params.startAt,
          endAt: params.endAt,
          allDay: params.allDay ?? false,
          uid,
        },
      };
    } catch (err: any) {
      this.logger.error(`[iCloud] createEvent: ${err.message}`);
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
      const auth = this.authHeader(creds);
      const eventUrl = this.resolveCalUrl(eventId);

      // Fetch existing event
      const { status: getStatus, text: existingIcal } =
        await this.caldavRequest(eventUrl, 'GET', auth);
      if (getStatus >= 400) {
        throw new Error(`Could not fetch existing event (status ${getStatus})`);
      }

      const existing = parseVEvents(existingIcal);
      if (existing.length === 0) {
        throw new Error('Could not parse existing event for update');
      }
      const ev = existing[0];

      // Merge params into existing event data
      const merged: CreateEventParams = {
        title: params.title ?? ev.summary,
        description: params.description ?? (ev.description || undefined),
        location: params.location ?? (ev.location || undefined),
        startAt: params.startAt ?? ev.dtstart,
        endAt: params.endAt ?? ev.dtend,
        allDay: params.allDay ?? !ev.dtstart.includes('T'),
        timeZone: params.timeZone,
      };

      const updatedIcal = buildVEvent({ uid: ev.uid, ...merged });

      const { status: putStatus } = await this.caldavRequest(
        eventUrl,
        'PUT',
        auth,
        {
          contentType: 'text/calendar; charset=utf-8',
          body: updatedIcal,
        },
      );

      if (putStatus >= 400) {
        throw new Error(`CalDAV PUT (update) failed with status ${putStatus}`);
      }

      return {
        ok: true,
        data: {
          id: eventUrl,
          calendarId,
          title: merged.title,
          description: merged.description,
          location: merged.location,
          startAt: merged.startAt,
          endAt: merged.endAt,
          allDay: merged.allDay ?? false,
          uid: ev.uid,
        },
      };
    } catch (err: any) {
      this.logger.error(`[iCloud] updateEvent: ${err.message}`);
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
      const auth = this.authHeader(creds);
      const eventUrl = this.resolveCalUrl(eventId);

      const { status } = await this.caldavRequest(eventUrl, 'DELETE', auth);
      if (status >= 400) {
        throw new Error(`DELETE event failed with status ${status}`);
      }
      return { ok: true, data: { deleted: true } };
    } catch (err: any) {
      this.logger.error(`[iCloud] deleteEvent: ${err.message}`);
      return { ok: false, message: err.message };
    }
  }
}
