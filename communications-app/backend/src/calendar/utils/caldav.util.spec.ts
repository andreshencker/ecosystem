/**
 * Tests for caldav.util.ts — focusing on timezone propagation through ExpandedVEvent.
 *
 * These tests verify that the IANA timezone from DTSTART;TZID= is preserved in the
 * ExpandedVEvent output and not silently discarded during VEVENT parsing or expansion.
 */

import {
  parseVEvents,
  expandVEventsInRange,
  extractCalendarTimezone,
  convertICalDate,
  icalRawToUTCDate,
  utcToLocalDateTimeString,
} from './caldav.util';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeVCalendar(veventBody: string): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Test//Test//EN',
    'BEGIN:VEVENT',
    veventBody,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

// ─── convertICalDate ──────────────────────────────────────────────────────────

describe('convertICalDate', () => {
  it('local datetime (no Z) → bare ISO without Z', () => {
    expect(convertICalDate('20260709T120000')).toBe('2026-07-09T12:00:00');
  });

  it('UTC datetime (ends Z) → ISO with Z', () => {
    expect(convertICalDate('20260709T020000Z')).toBe('2026-07-09T02:00:00Z');
  });

  it('date-only → YYYY-MM-DD', () => {
    expect(convertICalDate('20260709')).toBe('2026-07-09');
  });
});

// ─── utcToLocalDateTimeString ─────────────────────────────────────────────────

describe('utcToLocalDateTimeString', () => {
  it('02:00 UTC in Australia/Sydney (UTC+10, July=winter) → 12:00 local', () => {
    const utc = new Date('2026-07-09T02:00:00Z');
    const result = utcToLocalDateTimeString(utc, 'Australia/Sydney');
    expect(result).toBe('2026-07-09T12:00:00');
  });

  it('01:00 UTC in Australia/Sydney (UTC+11, Jan=AEDT summer) → 12:00 local', () => {
    const utc = new Date('2026-01-09T01:00:00Z');
    const result = utcToLocalDateTimeString(utc, 'Australia/Sydney');
    expect(result).toBe('2026-01-09T12:00:00');
  });

  it('midnight UTC in New_York (UTC-5 EST) → 19:00 previous day', () => {
    const utc = new Date('2026-07-09T00:00:00Z');
    const result = utcToLocalDateTimeString(utc, 'America/New_York');
    // July: EDT = UTC-4
    expect(result).toBe('2026-07-08T20:00:00');
  });

  it('invalid IANA timezone falls back to UTC ISO string (with Z)', () => {
    const utc = new Date('2026-07-09T12:00:00Z');
    const result = utcToLocalDateTimeString(utc, 'Not/A_Real_Zone');
    // Fallback: utc.toISOString() stripped of milliseconds → ends in Z
    expect(result).toBe('2026-07-09T12:00:00Z');
  });
});

// ─── parseVEvents — TZID propagation ─────────────────────────────────────────

describe('parseVEvents TZID extraction', () => {
  it('extracts TZID from DTSTART;TZID=Australia/Sydney:20260709T120000', () => {
    const ical = makeVCalendar(
      [
        'UID:test-123',
        'DTSTART;TZID=Australia/Sydney:20260709T120000',
        'DTEND;TZID=Australia/Sydney:20260709T170000',
        'SUMMARY:Work shift',
      ].join('\r\n'),
    );

    const events = parseVEvents(ical);
    expect(events).toHaveLength(1);
    expect(events[0].dtStartTzid).toBe('Australia/Sydney');
    // dtstart should be bare local (no Z)
    expect(events[0].dtstart).toBe('2026-07-09T12:00:00');
    expect(events[0].dtstart).not.toMatch(/Z$/);
  });

  it('dtStartTzid is undefined for UTC events (no TZID param)', () => {
    const ical = makeVCalendar(
      [
        'UID:test-456',
        'DTSTART:20260709T020000Z',
        'DTEND:20260709T070000Z',
        'SUMMARY:UTC event',
      ].join('\r\n'),
    );

    const events = parseVEvents(ical);
    expect(events[0].dtStartTzid).toBeUndefined();
    expect(events[0].dtstart).toBe('2026-07-09T02:00:00Z');
  });
});

// ─── expandVEventsInRange — timeZone propagation ──────────────────────────────

describe('expandVEventsInRange timeZone propagation', () => {
  const from = new Date('2026-07-01T00:00:00Z');
  const to = new Date('2026-07-31T23:59:59Z');

  it('non-recurring: timeZone is propagated from dtStartTzid', () => {
    const ical = makeVCalendar(
      [
        'UID:shift-nonrecur',
        'DTSTART;TZID=Australia/Sydney:20260709T120000',
        'DTEND;TZID=Australia/Sydney:20260709T170000',
        'SUMMARY:Non-recurring shift',
      ].join('\r\n'),
    );

    const parsed = parseVEvents(ical);
    const expanded = expandVEventsInRange(parsed, from, to);

    expect(expanded).toHaveLength(1);
    expect(expanded[0].timeZone).toBe('Australia/Sydney');
    // dtstart should be the bare local string, not UTC
    expect(expanded[0].dtstart).toBe('2026-07-09T12:00:00');
    expect(expanded[0].dtstart).not.toMatch(/Z$/);
  });

  it('non-recurring: timeZone is undefined for UTC events', () => {
    const ical = makeVCalendar(
      [
        'UID:shift-utc',
        'DTSTART:20260709T020000Z',
        'DTEND:20260709T070000Z',
        'SUMMARY:UTC shift',
      ].join('\r\n'),
    );

    const parsed = parseVEvents(ical);
    const expanded = expandVEventsInRange(parsed, from, to);

    expect(expanded[0].timeZone).toBeUndefined();
  });

  it('recurring: timeZone propagated from master dtStartTzid', () => {
    const ical = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Test//EN',
      'BEGIN:VEVENT',
      'UID:recurring-shift',
      'DTSTART;TZID=Australia/Sydney:20260706T120000',
      'DTEND;TZID=Australia/Sydney:20260706T170000',
      'RRULE:FREQ=WEEKLY;COUNT=3',
      'SUMMARY:Weekly shift',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const parsed = parseVEvents(ical);
    const expanded = expandVEventsInRange(parsed, from, to);

    // All occurrences should carry the IANA timezone
    expect(expanded.length).toBeGreaterThan(0);
    for (const ev of expanded) {
      expect(ev.timeZone).toBe('Australia/Sydney');
    }
  });

  it('recurring: dtstart is bare local string (not UTC) when TZID is available', () => {
    const ical = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Test//EN',
      'BEGIN:VEVENT',
      'UID:recurring-local',
      'DTSTART;TZID=Australia/Sydney:20260706T120000',
      'DTEND;TZID=Australia/Sydney:20260706T170000',
      'RRULE:FREQ=WEEKLY;COUNT=2',
      'SUMMARY:Weekly shift',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const parsed = parseVEvents(ical);
    const expanded = expandVEventsInRange(parsed, from, to);

    expect(expanded.length).toBeGreaterThan(0);
    for (const ev of expanded) {
      // With our fix, recurring occurrences should carry bare local strings
      // (not UTC Z strings) when the IANA timezone is known.
      expect(ev.dtstart).not.toMatch(/Z$/); // must NOT end in Z
      expect(ev.dtstart).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
      // Local hour should be 12 (noon in Sydney)
      const localHour = parseInt(ev.dtstart.slice(11, 13));
      expect(localHour).toBe(12);
    }
  });

  it('recurring occurrence without TZID: dtstart is UTC ISO string', () => {
    const ical = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Test//EN',
      'BEGIN:VEVENT',
      'UID:recurring-utc',
      'DTSTART:20260706T020000Z',
      'DTEND:20260706T070000Z',
      'RRULE:FREQ=WEEKLY;COUNT=2',
      'SUMMARY:Weekly UTC shift',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const parsed = parseVEvents(ical);
    const expanded = expandVEventsInRange(parsed, from, to);

    expect(expanded.length).toBeGreaterThan(0);
    for (const ev of expanded) {
      expect(ev.timeZone).toBeUndefined();
      // UTC Z string is the only option when no TZID available
      expect(ev.dtstart).toMatch(/Z$/);
    }
  });
});

// ─── extractCalendarTimezone ─────────────────────────────────────────────────

describe('extractCalendarTimezone', () => {
  it('extracts X-WR-TIMEZONE from a LASSO-style UTC feed', () => {
    const ical = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'X-WR-TIMEZONE:Australia/Sydney',
      'BEGIN:VEVENT',
      'UID:lasso-event-1',
      'DTSTART:20260721T030000Z',
      'DTEND:20260721T080000Z',
      'SUMMARY:No Limit Boxing',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    expect(extractCalendarTimezone(ical)).toBe('Australia/Sydney');
  });

  it('extracts TZID from first VTIMEZONE block when no X-WR-TIMEZONE', () => {
    const ical = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VTIMEZONE',
      'TZID:America/New_York',
      'BEGIN:STANDARD',
      'TZOFFSETFROM:-0400',
      'END:STANDARD',
      'END:VTIMEZONE',
      'BEGIN:VEVENT',
      'UID:tz-event',
      'DTSTART;TZID=America/New_York:20260721T090000',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    expect(extractCalendarTimezone(ical)).toBe('America/New_York');
  });

  it('prefers X-WR-TIMEZONE over VTIMEZONE when both are present', () => {
    const ical = [
      'BEGIN:VCALENDAR',
      'X-WR-TIMEZONE:Australia/Sydney',
      'BEGIN:VTIMEZONE',
      'TZID:UTC',
      'END:VTIMEZONE',
      'END:VCALENDAR',
    ].join('\r\n');
    expect(extractCalendarTimezone(ical)).toBe('Australia/Sydney');
  });

  it('returns null when no timezone info is present', () => {
    const ical = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'UID:no-tz',
      'DTSTART:20260721T030000Z',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    expect(extractCalendarTimezone(ical)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractCalendarTimezone('')).toBeNull();
  });
});

// ─── expandVEventsInRange with calendarTz ─────────────────────────────────────

describe('expandVEventsInRange with calendarTz (X-WR-TIMEZONE pattern)', () => {
  const from = new Date('2026-07-01T00:00:00Z');
  const to = new Date('2026-07-31T23:59:59Z');

  // The primary LASSO regression scenario:
  // - ICS has X-WR-TIMEZONE:Australia/Sydney
  // - Events use UTC-Z timestamps with no per-event TZID
  // - 1:00 PM–6:00 PM AEST = 03:00–08:00 UTC
  it('non-recurring UTC-Z event + calendarTz: timeZone set, time preserved in UTC string', () => {
    const ical = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'X-WR-TIMEZONE:Australia/Sydney',
      'BEGIN:VEVENT',
      'UID:lasso-no-limit-boxing',
      'DTSTART:20260721T030000Z',
      'DTEND:20260721T080000Z',
      'SUMMARY:No Limit Boxing',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const parsed = parseVEvents(ical);
    const calTz = extractCalendarTimezone(ical);
    const expanded = expandVEventsInRange(parsed, from, to, calTz);

    expect(expanded).toHaveLength(1);
    // timeZone must be propagated so Business App can convert 03:00Z → 13:00 AEST
    expect(expanded[0].timeZone).toBe('Australia/Sydney');
    // dtstart remains the UTC-Z string (the Business App mapper converts it)
    expect(expanded[0].dtstart).toBe('2026-07-21T03:00:00Z');
    expect(expanded[0].dtend).toBe('2026-07-21T08:00:00Z');
  });

  it('non-recurring UTC-Z event WITHOUT calendarTz: timeZone stays undefined', () => {
    const ical = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:no-tz-event',
      'DTSTART:20260721T030000Z',
      'DTEND:20260721T080000Z',
      'SUMMARY:No TZ',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const parsed = parseVEvents(ical);
    const expanded = expandVEventsInRange(parsed, from, to);
    expect(expanded[0].timeZone).toBeUndefined();
  });

  it('per-event TZID takes priority over calendarTz', () => {
    const ical = [
      'BEGIN:VCALENDAR',
      'X-WR-TIMEZONE:UTC', // calendar says UTC
      'BEGIN:VEVENT',
      'UID:tzid-priority',
      'DTSTART;TZID=Australia/Sydney:20260721T130000', // event says Sydney
      'DTEND;TZID=Australia/Sydney:20260721T180000',
      'SUMMARY:TZID wins',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const parsed = parseVEvents(ical);
    const calTz = extractCalendarTimezone(ical); // 'UTC'
    const expanded = expandVEventsInRange(parsed, from, to, calTz);

    // Per-event TZID (Australia/Sydney) must win over calendarTz (UTC)
    expect(expanded[0].timeZone).toBe('Australia/Sydney');
    expect(expanded[0].dtstart).toBe('2026-07-21T13:00:00');
  });

  it('recurring UTC-Z event + calendarTz: occurrences carry timeZone and bare-local dtstart', () => {
    // Weekly recurring UTC-Z event — LASSO style
    const ical = [
      'BEGIN:VCALENDAR',
      'X-WR-TIMEZONE:Australia/Sydney',
      'BEGIN:VEVENT',
      'UID:lasso-weekly',
      'DTSTART:20260706T030000Z', // 13:00 AEST
      'DTEND:20260706T080000Z', // 18:00 AEST
      'RRULE:FREQ=WEEKLY;COUNT=3',
      'SUMMARY:Weekly LASSO',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const parsed = parseVEvents(ical);
    const calTz = extractCalendarTimezone(ical);
    const expanded = expandVEventsInRange(parsed, from, to, calTz);

    expect(expanded.length).toBeGreaterThan(0);
    for (const ev of expanded) {
      // Each occurrence must carry Australia/Sydney so Business App can convert
      expect(ev.timeZone).toBe('Australia/Sydney');
      // With calendarTz, rrule occurrences are re-expressed as bare-local strings
      expect(ev.dtstart).not.toMatch(/Z$/);
      // Local hour in Australia/Sydney for 03:00Z UTC+10 (July, standard time) = 13:00
      const localHour = parseInt(ev.dtstart.slice(11, 13), 10);
      expect(localHour).toBe(13);
    }
  });

  it('LASSO-pattern: 03:00Z UTC with Australia/Sydney → expanded dtstart is 13:00 local', () => {
    // Confirms that utcToLocalDateTimeString is applied with the calendarTz
    const ical = [
      'BEGIN:VCALENDAR',
      'X-WR-TIMEZONE:Australia/Sydney',
      'BEGIN:VEVENT',
      'UID:lasso-single',
      'DTSTART:20260721T030000Z',
      'DTEND:20260721T080000Z',
      'RRULE:FREQ=DAILY;COUNT=1',
      'SUMMARY:LASSO shift',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const parsed = parseVEvents(ical);
    const calTz = extractCalendarTimezone(ical);
    const expanded = expandVEventsInRange(parsed, from, to, calTz);

    expect(expanded).toHaveLength(1);
    expect(expanded[0].timeZone).toBe('Australia/Sydney');
    // utcToLocalDateTimeString(03:00Z, 'Australia/Sydney') = 13:00 AEST
    expect(expanded[0].dtstart).toBe('2026-07-21T13:00:00');
    expect(expanded[0].dtend).toBe('2026-07-21T18:00:00');
  });

  it('midnight-end overnight event: 22:00Z same day = 08:00 next day AEST', () => {
    // Source: 10:00 PM–12:00 AM AEST = 12:00Z–14:00Z UTC
    // Business App should persist endDate as next day, endTime as 00:00
    const ical = [
      'BEGIN:VCALENDAR',
      'X-WR-TIMEZONE:Australia/Sydney',
      'BEGIN:VEVENT',
      'UID:overnight',
      'DTSTART:20260721T120000Z',
      'DTEND:20260721T140000Z',
      'SUMMARY:Late event',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const parsed = parseVEvents(ical);
    const calTz = extractCalendarTimezone(ical);
    const expanded = expandVEventsInRange(parsed, from, to, calTz);

    expect(expanded).toHaveLength(1);
    expect(expanded[0].timeZone).toBe('Australia/Sydney');
    // 12:00Z → 22:00 AEST;  14:00Z → 00:00 next day AEST
    // (non-recurring: dtstart stays as UTC-Z string; mapper converts to local)
    expect(expanded[0].dtstart).toBe('2026-07-21T12:00:00Z');
    expect(expanded[0].dtend).toBe('2026-07-21T14:00:00Z');
  });
});

// ─── icalRawToUTCDate ─────────────────────────────────────────────────────────

describe('icalRawToUTCDate', () => {
  it('converts UTC datetime correctly', () => {
    const d = icalRawToUTCDate('20260709T020000Z');
    expect(d?.toISOString()).toBe('2026-07-09T02:00:00.000Z');
  });

  it('converts TZID-local datetime to UTC correctly for Sydney', () => {
    const d = icalRawToUTCDate('20260709T120000', 'Australia/Sydney');
    // 12:00 AEST (UTC+10) = 02:00 UTC
    expect(d?.toISOString()).toBe('2026-07-09T02:00:00.000Z');
  });

  it('converts floating time as UTC when no TZID', () => {
    const d = icalRawToUTCDate('20260709T120000');
    expect(d?.toISOString()).toBe('2026-07-09T12:00:00.000Z');
  });
});
