/**
 * Tests for caldav.util.ts — focusing on timezone propagation through ExpandedVEvent.
 *
 * These tests verify that the IANA timezone from DTSTART;TZID= is preserved in the
 * ExpandedVEvent output and not silently discarded during VEVENT parsing or expansion.
 */

import {
  parseVEvents,
  expandVEventsInRange,
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
    const utc    = new Date('2026-07-09T02:00:00Z');
    const result = utcToLocalDateTimeString(utc, 'Australia/Sydney');
    expect(result).toBe('2026-07-09T12:00:00');
  });

  it('01:00 UTC in Australia/Sydney (UTC+11, Jan=AEDT summer) → 12:00 local', () => {
    const utc    = new Date('2026-01-09T01:00:00Z');
    const result = utcToLocalDateTimeString(utc, 'Australia/Sydney');
    expect(result).toBe('2026-01-09T12:00:00');
  });

  it('midnight UTC in New_York (UTC-5 EST) → 19:00 previous day', () => {
    const utc    = new Date('2026-07-09T00:00:00Z');
    const result = utcToLocalDateTimeString(utc, 'America/New_York');
    // July: EDT = UTC-4
    expect(result).toBe('2026-07-08T20:00:00');
  });

  it('invalid IANA timezone falls back to UTC ISO string (with Z)', () => {
    const utc    = new Date('2026-07-09T12:00:00Z');
    const result = utcToLocalDateTimeString(utc, 'Not/A_Real_Zone');
    // Fallback: utc.toISOString() stripped of milliseconds → ends in Z
    expect(result).toBe('2026-07-09T12:00:00Z');
  });
});

// ─── parseVEvents — TZID propagation ─────────────────────────────────────────

describe('parseVEvents TZID extraction', () => {
  it('extracts TZID from DTSTART;TZID=Australia/Sydney:20260709T120000', () => {
    const ical = makeVCalendar([
      'UID:test-123',
      'DTSTART;TZID=Australia/Sydney:20260709T120000',
      'DTEND;TZID=Australia/Sydney:20260709T170000',
      'SUMMARY:Work shift',
    ].join('\r\n'));

    const events = parseVEvents(ical);
    expect(events).toHaveLength(1);
    expect(events[0].dtStartTzid).toBe('Australia/Sydney');
    // dtstart should be bare local (no Z)
    expect(events[0].dtstart).toBe('2026-07-09T12:00:00');
    expect(events[0].dtstart).not.toMatch(/Z$/);
  });

  it('dtStartTzid is undefined for UTC events (no TZID param)', () => {
    const ical = makeVCalendar([
      'UID:test-456',
      'DTSTART:20260709T020000Z',
      'DTEND:20260709T070000Z',
      'SUMMARY:UTC event',
    ].join('\r\n'));

    const events = parseVEvents(ical);
    expect(events[0].dtStartTzid).toBeUndefined();
    expect(events[0].dtstart).toBe('2026-07-09T02:00:00Z');
  });
});

// ─── expandVEventsInRange — timeZone propagation ──────────────────────────────

describe('expandVEventsInRange timeZone propagation', () => {
  const from = new Date('2026-07-01T00:00:00Z');
  const to   = new Date('2026-07-31T23:59:59Z');

  it('non-recurring: timeZone is propagated from dtStartTzid', () => {
    const ical = makeVCalendar([
      'UID:shift-nonrecur',
      'DTSTART;TZID=Australia/Sydney:20260709T120000',
      'DTEND;TZID=Australia/Sydney:20260709T170000',
      'SUMMARY:Non-recurring shift',
    ].join('\r\n'));

    const parsed   = parseVEvents(ical);
    const expanded = expandVEventsInRange(parsed, from, to);

    expect(expanded).toHaveLength(1);
    expect(expanded[0].timeZone).toBe('Australia/Sydney');
    // dtstart should be the bare local string, not UTC
    expect(expanded[0].dtstart).toBe('2026-07-09T12:00:00');
    expect(expanded[0].dtstart).not.toMatch(/Z$/);
  });

  it('non-recurring: timeZone is undefined for UTC events', () => {
    const ical = makeVCalendar([
      'UID:shift-utc',
      'DTSTART:20260709T020000Z',
      'DTEND:20260709T070000Z',
      'SUMMARY:UTC shift',
    ].join('\r\n'));

    const parsed   = parseVEvents(ical);
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

    const parsed   = parseVEvents(ical);
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

    const parsed   = parseVEvents(ical);
    const expanded = expandVEventsInRange(parsed, from, to);

    expect(expanded.length).toBeGreaterThan(0);
    for (const ev of expanded) {
      // With our fix, recurring occurrences should carry bare local strings
      // (not UTC Z strings) when the IANA timezone is known.
      expect(ev.dtstart).not.toMatch(/Z$/);  // must NOT end in Z
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

    const parsed   = parseVEvents(ical);
    const expanded = expandVEventsInRange(parsed, from, to);

    expect(expanded.length).toBeGreaterThan(0);
    for (const ev of expanded) {
      expect(ev.timeZone).toBeUndefined();
      // UTC Z string is the only option when no TZID available
      expect(ev.dtstart).toMatch(/Z$/);
    }
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
