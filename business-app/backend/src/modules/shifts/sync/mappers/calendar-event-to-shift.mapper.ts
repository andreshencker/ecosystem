import type { CommCalendarEventInfo } from '../../../linked-calendars/clients/communications-calendar.client';
import type { LinkedCalendarResponseDto } from '../../../linked-calendars/dto/linked-calendar-response.dto';

/**
 * Normalized shift fields derived from a calendar event.
 * This is what the sync engine writes to the shifts collection.
 */
export interface NormalizedShiftFromEvent {
  // Calendar identity
  linkedCalendarId:     string;
  calendarProvider:     string;
  calendarAccount:      string;
  calendarId:           string;
  calendarName:         string;
  externalEventId:      string;
  externalOccurrenceId: string;

  // Business time fields
  date:      string;   // YYYY-MM-DD — local start date in the event timezone
  startTime: string;   // HH:mm — local start time
  endTime:   string;   // HH:mm — local end time
  endDate:   string;   // YYYY-MM-DD — local end date (differs from date for overnight shifts)

  // Calendar event fields
  title:       string;
  description: string | null;
  location:    string | null;
  start:       Date;
  end:         Date;
  allDay:      boolean;
  timezone:    string | null;
  organizer:   string | null;
  attendees:   string[];
  lastExternalUpdate: Date | null;

  // Sync metadata
  syncStatus:             'synced';
  createdFromCalendar:    true;
  contractAssigned:       false;
  hourCalculationStatus:  'pending';
  invoiceStatus:          'pending';
  status:                 'draft';
  contractId:             null;
  customerId:             null;
  metadata:               Record<string, any> | null;
}

export class CalendarEventToShiftMapper {
  /**
   * Map a Communications calendar event to the fields stored in a Shift document.
   * Never throws — returns null if the event cannot be parsed.
   */

  /**
   * Derive YYYY-MM-DD and HH:mm in the event's local timezone using Node's
   * built-in Intl.DateTimeFormat (no external library required).
   *
   * Fallback chain (in order):
   *   1. event.timeZone (IANA string from Communications)
   *   2. calendar.timezone (account-level default)
   *   3. Offset embedded in the raw provider string (e.g. +10:00) — when the
   *      provider sends a non-UTC offset but omits the IANA timezone label, the
   *      local components are directly readable from the ISO 8601 string.
   *   4. UTC (explicit documented fallback — logged as a warning by the caller)
   */
  private static toLocalDateTime(
    dt: Date,
    tzid: string | null | undefined,
  ): { date: string; time: string } {
    const tz = tzid || 'UTC';
    try {
      const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone:    tz,
        year:        'numeric',
        month:       '2-digit',
        day:         '2-digit',
        hour:        '2-digit',
        minute:      '2-digit',
        hour12:      false,
      });
      const parts = Object.fromEntries(fmt.formatToParts(dt).map((p) => [p.type, p.value]));
      // en-CA locale always produces YYYY-MM-DD for date parts
      const date = `${parts.year}-${parts.month}-${parts.day}`;
      // Normalize midnight-as-"24:00" edge case produced by some Intl implementations
      const hour = parts.hour === '24' ? '00' : parts.hour;
      const time = `${hour}:${parts.minute}`;
      return { date, time };
    } catch {
      // Unrecognised timezone string — fall back to UTC via a clean Intl path
      // rather than opaque ISO string slicing.  Documented fallback: UTC.
      const utcFmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'UTC',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
        hour12: false,
      });
      const up = Object.fromEntries(utcFmt.formatToParts(dt).map((p) => [p.type, p.value]));
      return {
        date: `${up.year}-${up.month}-${up.day}`,
        time: up.hour === '24' ? `00:${up.minute}` : `${up.hour}:${up.minute}`,
      };
    }
  }

  /**
   * Extract the local date and time directly from an offset-aware ISO 8601 string.
   *
   * An offset-aware string encodes the local time by definition:
   *   "2026-07-09T12:00:00+10:00" → local time is 12:00 on 2026-07-09 in +10:00
   *
   * Returns null for UTC strings (ending in Z) or strings without any offset,
   * so callers can fall through to the next extraction strategy.
   */
  private static extractFromOffsetAwareString(
    isoString: string,
  ): { date: string; time: string } | null {
    const match = isoString.match(
      /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::\d{2})?(?:\.\d+)?([+-]\d{2}:?\d{2})$/,
    );
    if (!match) return null;

    const offset = match[4].replace(':', '');  // e.g. "+1000" or "-0500"
    // UTC offsets carry no local-time info beyond UTC itself.
    if (offset === '+0000' || offset === '-0000') return null;

    return { date: match[1], time: `${match[2]}:${match[3]}` };
  }

  /**
   * Extract the local date and time from a bare local datetime string.
   *
   * A bare local datetime (no Z, no offset, no timezone suffix) represents a
   * "floating time" or a TZID-qualified time whose timezone was stripped by the
   * caller. The local date and time components are literally encoded in the string:
   *   "2026-07-09T12:00:00" → local 12:00 on 2026-07-09
   *
   * This is the format emitted by Communications when it strips the iCal TZID
   * parameter from DTSTART and converts the compact iCal form to ISO 8601 without
   * appending a Z. It must NOT be parsed through new Date() because that would
   * interpret it as local machine time and silently shift the result to UTC.
   *
   * Returns null for strings that end in Z or carry an explicit offset —
   * those are handled by extractFromOffsetAwareString or the UTC fallback.
   */
  private static extractFromLocalDateTimeString(
    isoString: string,
  ): { date: string; time: string } | null {
    // Must match YYYY-MM-DDTHH:mm[:ss] with NO Z and NO +/- offset suffix.
    const match = isoString.match(
      /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/,
    );
    if (!match) return null;
    return { date: match[1], time: `${match[2]}:${match[3]}` };
  }

  /**
   * Full local-time resolution with the complete fallback chain.
   *
   * Fallback order (in priority):
   * 1. Bare local datetime string (no Z, no offset) — the local components ARE the
   *    value. Must be checked FIRST. Communications emits bare-local strings for
   *    TZID-qualified iCal events (utcToLocalDateTimeString output) and for floating
   *    times. Applying new Date() + Intl.DateTimeFormat to a bare-local string on a
   *    UTC Node server would treat it as UTC and produce wrong local times.
   * 2. IANA timezone via Intl.DateTimeFormat — converts a real UTC instant to local.
   *    Only reached for UTC-Z or offset-aware strings that represent a true instant.
   * 3. Non-UTC offset embedded in raw string (+HH:MM / -HH:MM) — local time readable
   *    directly from the string when no IANA timezone is available.
   * 4. UTC fallback (for Z-terminated strings with no IANA timezone).
   */
  private static resolveLocalDateTime(
    dt: Date,
    rawString: string,
    tzid: string | null | undefined,
  ): { date: string; time: string } {
    // 1. Bare local datetime string — local components are literally in the string.
    //    This covers: TZID-qualified events (Communications emits local string + timeZone),
    //    floating times, and utcToLocalDateTimeString output for recurring occurrences.
    //    Must precede IANA: new Date('2026-07-21T13:00:00') on a UTC server = 13:00Z,
    //    and Intl would then convert 13:00Z → 23:00 AEST (double-conversion).
    const fromLocal = CalendarEventToShiftMapper.extractFromLocalDateTimeString(rawString);
    if (fromLocal) return fromLocal;

    // 2. IANA timezone — converts a UTC instant (Z-string or offset-aware string) to local.
    if (tzid) {
      return CalendarEventToShiftMapper.toLocalDateTime(dt, tzid);
    }
    // 3. Explicit non-UTC offset in the string (+10:00 etc.)
    const fromOffset = CalendarEventToShiftMapper.extractFromOffsetAwareString(rawString);
    if (fromOffset) return fromOffset;
    // 4. UTC fallback (Z-terminated strings; no local info available)
    return CalendarEventToShiftMapper.toLocalDateTime(dt, null);
  }

  // Temporary diagnostic logger — remove after timezone flow is verified.
  private static readonly _logger = { log: (msg: string) => process.stdout.write(`[SHIFT_MAPPER] ${msg}\n`) };

  static map(
    event:    CommCalendarEventInfo,
    calendar: LinkedCalendarResponseDto,
  ): NormalizedShiftFromEvent | null {
    if (!event.startAt) return null;

    // BUSINESS_APP_SYNC_RECEIVED
    CalendarEventToShiftMapper._logger.log(
      `BUSINESS_APP_SYNC_RECEIVED | eventId=${event.id} calendarId=${event.calendarId} ` +
      `startAt=${event.startAt} endAt=${event.endAt ?? 'undefined'} ` +
      `event.timeZone=${event.timeZone ?? 'undefined'} calendar.timezone=${calendar.timezone ?? 'null'}`,
    );

    const start = new Date(event.startAt);
    const end   = event.endAt ? new Date(event.endAt) : start;

    if (isNaN(start.getTime())) return null;

    const tzid = event.timeZone ?? calendar.timezone;

    let date:      string;
    let startTime: string;
    let endTime:   string;
    let endDate:   string;

    if (event.allDay) {
      // All-day events: the provider date string is authoritative.
      // iCal DATE type carries no time component, so slicing the raw string
      // is correct — we must NOT convert through UTC (which would shift the date).
      date      = event.startAt.slice(0, 10);
      endDate   = event.endAt ? event.endAt.slice(0, 10) : date;
      startTime = '00:00';
      endTime   = '23:59';
    } else {
      const startLocal = CalendarEventToShiftMapper.resolveLocalDateTime(start, event.startAt, tzid);
      const endRaw     = event.endAt ?? event.startAt;
      const endLocal   = CalendarEventToShiftMapper.resolveLocalDateTime(end, endRaw, tzid);
      date      = startLocal.date;
      startTime = startLocal.time;
      endDate   = endLocal.date;
      endTime   = endLocal.time;
    }

    // BUSINESS_APP_SHIFT_NORMALIZED
    CalendarEventToShiftMapper._logger.log(
      `BUSINESS_APP_SHIFT_NORMALIZED | eventId=${event.id} ` +
      `resolvedTzid=${tzid ?? 'null'} ` +
      `date=${date} startTime=${startTime} endDate=${endDate} endTime=${endTime}`,
    );

    return {
      linkedCalendarId:     calendar.id,
      calendarProvider:     calendar.providerKey,
      calendarAccount:      calendar.accountIdentifier,
      calendarId:           calendar.externalCalendarId,
      calendarName:         calendar.calendarName,
      externalEventId:      event.uid    ?? event.id,
      externalOccurrenceId: event.id,
      date,
      startTime,
      endDate,
      endTime,
      title:       event.title       || '(no title)',
      description: event.description ?? null,
      location:    event.location    ?? null,
      start,
      end,
      allDay:    event.allDay  ?? false,
      timezone:  tzid ?? null,
      organizer: event.organizerEmail ?? null,
      attendees: (event.attendees ?? []).map((a) => a.email).filter(Boolean),
      lastExternalUpdate: event.raw?.lastModified
        ? new Date(event.raw.lastModified as string)
        : null,
      syncStatus:            'synced',
      createdFromCalendar:   true,
      contractAssigned:      false,
      hourCalculationStatus: 'pending',
      invoiceStatus:         'pending',
      status:                'draft',
      contractId:            null,
      customerId:            null,
      metadata: event.raw ?? null,
    };
  }
}
