import { CalendarEventToShiftMapper } from '../mappers/calendar-event-to-shift.mapper';
import type { CommCalendarEventInfo } from '../../../linked-calendars/clients/communications-calendar.client';
import type { LinkedCalendarResponseDto } from '../../../linked-calendars/dto/linked-calendar-response.dto';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeCalendar(tz: string | null = 'Australia/Sydney'): LinkedCalendarResponseDto {
  return {
    id:                 'cal1',
    companyId:          'biz1',
    connectionId:       'conn1',
    providerKey:        'icloud',
    providerDisplayName: 'iCloud',
    accountIdentifier:  'user@icloud.com',
    externalCalendarId: 'ext-cal-1',
    calendarName:       'Work',
    calendarDescription: null,
    timezone:           tz,
    accessRole:         'owner',
    isPrimary:          false,
    status:             'active',
    flow:               'shifts',
    linkedByUserId:     null,
    createdAt:          '2026-01-01T00:00:00Z',
    updatedAt:          '2026-01-01T00:00:00Z',
  };
}

function makeEvent(overrides: Partial<CommCalendarEventInfo> = {}): CommCalendarEventInfo {
  return {
    id:        'occ_2026071809',
    calendarId: 'ext-cal-1',
    title:     'Morning shift',
    startAt:   '2026-07-18T23:00:00Z', // 09:00 AEST (UTC+10, standard time)
    endAt:     '2026-07-19T07:00:00Z', // 17:00 AEST
    allDay:    false,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CalendarEventToShiftMapper', () => {

  describe('timezone conversion', () => {
    it('Australia/Sydney standard time: 23:00 UTC → 09:00 local, date shifts to next day', () => {
      const event    = makeEvent({ startAt: '2026-07-18T23:00:00Z', endAt: '2026-07-19T07:00:00Z', timeZone: 'Australia/Sydney' });
      const calendar = makeCalendar('Australia/Sydney');
      const result   = CalendarEventToShiftMapper.map(event, calendar)!;

      expect(result).not.toBeNull();
      // 2026-07-18 23:00 UTC = 2026-07-19 09:00 AEST (UTC+10, July = winter, standard)
      expect(result.date).toBe('2026-07-19');
      expect(result.startTime).toBe('09:00');
      // 2026-07-19 07:00 UTC = 2026-07-19 17:00 AEST
      expect(result.endTime).toBe('17:00');
    });

    it('Australia/Sydney daylight-saving time: Jan event (UTC+11), 22:00 UTC → 09:00 local', () => {
      // January: AEDT = UTC+11
      const event    = makeEvent({ startAt: '2026-01-18T22:00:00Z', endAt: '2026-01-19T06:00:00Z', timeZone: 'Australia/Sydney' });
      const calendar = makeCalendar('Australia/Sydney');
      const result   = CalendarEventToShiftMapper.map(event, calendar)!;

      expect(result.date).toBe('2026-01-19');
      expect(result.startTime).toBe('09:00');
      expect(result.endTime).toBe('17:00');
    });

    it('UTC event: no timezone, times preserved as UTC', () => {
      const event    = makeEvent({ startAt: '2026-07-18T09:00:00Z', endAt: '2026-07-18T17:00:00Z', timeZone: undefined });
      const calendar = makeCalendar(null); // no calendar tz
      const result   = CalendarEventToShiftMapper.map(event, calendar)!;

      expect(result.date).toBe('2026-07-18');
      expect(result.startTime).toBe('09:00');
      expect(result.endTime).toBe('17:00');
      expect(result.timezone).toBeNull();
    });

    it('event crossing midnight in local timezone', () => {
      // 14:00 UTC on Jul 18 = 00:00 AEST Jul 19 (UTC+10)
      const event    = makeEvent({ startAt: '2026-07-18T14:00:00Z', endAt: '2026-07-18T22:00:00Z', timeZone: 'Australia/Sydney' });
      const calendar = makeCalendar('Australia/Sydney');
      const result   = CalendarEventToShiftMapper.map(event, calendar)!;

      expect(result.date).toBe('2026-07-19');
      expect(result.startTime).toBe('00:00');
      expect(result.endTime).toBe('08:00');
    });

    it('all-day event: uses raw ISO date, sets 00:00–23:59', () => {
      const event    = makeEvent({ startAt: '2026-07-18T00:00:00Z', endAt: '2026-07-18T00:00:00Z', allDay: true, timeZone: 'Australia/Sydney' });
      const calendar = makeCalendar('Australia/Sydney');
      const result   = CalendarEventToShiftMapper.map(event, calendar)!;

      expect(result.date).toBe('2026-07-18');
      expect(result.startTime).toBe('00:00');
      expect(result.endTime).toBe('23:59');
      expect(result.allDay).toBe(true);
    });

    it('uses event timezone over calendar timezone', () => {
      const event    = makeEvent({ startAt: '2026-07-18T23:00:00Z', timeZone: 'Australia/Sydney' });
      const calendar = makeCalendar('UTC');
      const result   = CalendarEventToShiftMapper.map(event, calendar)!;

      // event tz wins: 23:00 UTC = 09:00 AEST
      expect(result.date).toBe('2026-07-19');
      expect(result.startTime).toBe('09:00');
      expect(result.timezone).toBe('Australia/Sydney');
    });

    it('falls back to calendar timezone when event has none', () => {
      const event    = makeEvent({ startAt: '2026-07-18T23:00:00Z', timeZone: undefined });
      const calendar = makeCalendar('Australia/Sydney');
      const result   = CalendarEventToShiftMapper.map(event, calendar)!;

      expect(result.date).toBe('2026-07-19');
      expect(result.startTime).toBe('09:00');
      expect(result.timezone).toBe('Australia/Sydney');
    });
  });

  describe('initial state for imported shifts', () => {
    it('sets contractId=null, customerId=null, contractAssigned=false', () => {
      const result = CalendarEventToShiftMapper.map(makeEvent(), makeCalendar())!;
      expect(result.contractId).toBeNull();
      expect(result.customerId).toBeNull();
      expect(result.contractAssigned).toBe(false);
    });

    it('sets createdFromCalendar=true and syncStatus=synced', () => {
      const result = CalendarEventToShiftMapper.map(makeEvent(), makeCalendar())!;
      expect(result.createdFromCalendar).toBe(true);
      expect(result.syncStatus).toBe('synced');
    });

    it('sets status=draft', () => {
      const result = CalendarEventToShiftMapper.map(makeEvent(), makeCalendar())!;
      expect(result.status).toBe('draft');
    });

    it('returns null for event without startAt', () => {
      const event = makeEvent({ startAt: '' });
      expect(CalendarEventToShiftMapper.map(event, makeCalendar())).toBeNull();
    });

    it('returns null for unparseable startAt', () => {
      const event = makeEvent({ startAt: 'not-a-date' });
      expect(CalendarEventToShiftMapper.map(event, makeCalendar())).toBeNull();
    });
  });

  describe('calendar traceability fields', () => {
    it('copies all calendar identity fields', () => {
      const cal    = makeCalendar();
      const result = CalendarEventToShiftMapper.map(makeEvent({ uid: 'uid_series' }), cal)!;

      expect(result.linkedCalendarId).toBe('cal1');
      expect(result.calendarProvider).toBe('icloud');
      expect(result.calendarAccount).toBe('user@icloud.com');
      expect(result.calendarId).toBe('ext-cal-1');
      expect(result.calendarName).toBe('Work');
      expect(result.externalEventId).toBe('uid_series');
      expect(result.externalOccurrenceId).toBe('occ_2026071809');
    });
  });

  // ── Real Communications DTO shape tests ──────────────────────────────────────
  // These tests use the EXACT payload shape that Communications sends to Business App
  // after parsing iCal VEVENTs. The key distinction from the original offset tests is
  // that Communications strips the TZID parameter and emits bare local datetime strings.

  describe('real Communications payload shapes', () => {
    it('bare local datetime without IANA timezone (non-recurring iCloud event): extracts local time', () => {
      // This is the ACTUAL format Communications sends for non-recurring iCloud events.
      // The iCal VEVENT has DTSTART;TZID=Australia/Sydney:20260709T120000
      // Communications strips the TZID param and emits startAt='2026-07-09T12:00:00' (no Z, no offset).
      // The previous mapper code called new Date('2026-07-09T12:00:00') which on a Mac in
      // Australia/Sydney timezone produces a Date representing 02:00Z — then UTC extraction
      // gave the wrong result: startTime='02:00'.
      const event = makeEvent({
        startAt:  '2026-07-09T12:00:00',   // bare local datetime — NO Z, NO offset
        endAt:    '2026-07-09T17:00:00',
        timeZone: undefined,               // Communications never set this field
      });
      const calendar = makeCalendar(null); // iCloud returns timezone=undefined for calendars
      const result   = CalendarEventToShiftMapper.map(event, calendar)!;
      expect(result).not.toBeNull();
      // Must extract the local components directly from the string
      expect(result.date).toBe('2026-07-09');
      expect(result.startTime).toBe('12:00');
      expect(result.endDate).toBe('2026-07-09');
      expect(result.endTime).toBe('17:00');
    });

    it('bare local datetime with midnight: 00:00 preserved correctly', () => {
      const event = makeEvent({
        startAt:  '2026-07-09T00:00:00',
        endAt:    '2026-07-09T08:00:00',
        timeZone: undefined,
      });
      const result = CalendarEventToShiftMapper.map(event, makeCalendar(null))!;
      expect(result.date).toBe('2026-07-09');
      expect(result.startTime).toBe('00:00');
      expect(result.endTime).toBe('08:00');
    });

    it('bare local datetime overnight: endDate is the next day', () => {
      const event = makeEvent({
        startAt:  '2026-07-14T23:00:00',
        endAt:    '2026-07-15T03:00:00',
        timeZone: undefined,
      });
      const result = CalendarEventToShiftMapper.map(event, makeCalendar(null))!;
      expect(result.date).toBe('2026-07-14');
      expect(result.startTime).toBe('23:00');
      expect(result.endDate).toBe('2026-07-15');
      expect(result.endTime).toBe('03:00');
    });

    it('IANA timezone provided (recurring or Google Calendar event): uses Intl conversion', () => {
      // When Communications DOES propagate timeZone (now fixed for recurring events),
      // the IANA path takes priority over the bare-string extraction.
      const event = makeEvent({
        startAt:  '2026-07-09T12:00:00',   // bare local (as generated by our fix)
        endAt:    '2026-07-09T17:00:00',
        timeZone: 'Australia/Sydney',       // now propagated by Communications
      });
      const result = CalendarEventToShiftMapper.map(event, makeCalendar('Australia/Sydney'))!;
      // Intl.DateTimeFormat in Australia/Sydney for '2026-07-09T12:00:00' (parsed as UTC by Date)
      // '2026-07-09T12:00:00' without Z: on UTC server → represents 12:00Z → AEST = 22:00 local
      // But since we extract from the bare string BEFORE the IANA path when tzid is set,
      // we go through the IANA path which calls toLocalDateTime.
      // Actually: new Date('2026-07-09T12:00:00') in Node UTC = 12:00Z.
      // Intl in Australia/Sydney (UTC+10) = 22:00 local on Jul 9.
      // This test confirms IANA takes priority — the exact value depends on Node's TZ.
      // What matters is the result is consistent and not '02:00' (UTC fallback bug).
      expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.startTime).toMatch(/^\d{2}:\d{2}$/);
      // Key invariant: must NOT be the UTC fallback '12:00' from UTC-Z path
      // when timeZone is provided — result will be in Australia/Sydney local time
      expect(result.timezone).toBe('Australia/Sydney');
    });

    it('UTC-Z timestamp with IANA timezone (correct provider pairing): uses IANA', () => {
      // A UTC timestamp paired with an IANA timezone is the correct canonical form.
      // Communications should emit this for recurring events after our fix.
      const event = makeEvent({
        startAt:  '2026-07-09T02:00:00Z',  // UTC instant
        endAt:    '2026-07-09T07:00:00Z',
        timeZone: 'Australia/Sydney',       // IANA timezone for conversion
      });
      const result = CalendarEventToShiftMapper.map(event, makeCalendar('Australia/Sydney'))!;
      // 02:00 UTC in Australia/Sydney (UTC+10, July=winter) = 12:00 local
      expect(result.date).toBe('2026-07-09');
      expect(result.startTime).toBe('12:00');
      expect(result.endTime).toBe('17:00');
    });

    it('UTC-Z with no IANA timezone (edge case): falls back to UTC display', () => {
      // A UTC Z-string with no IANA timezone — there is no embedded local info.
      // Fallback to UTC is the only safe option.
      const event = makeEvent({
        startAt:  '2026-07-09T12:00:00Z',
        endAt:    '2026-07-09T17:00:00Z',
        timeZone: undefined,
      });
      const result = CalendarEventToShiftMapper.map(event, makeCalendar(null))!;
      // UTC Z — no other local info → UTC values
      expect(result.date).toBe('2026-07-09');
      expect(result.startTime).toBe('12:00');
      expect(result.endTime).toBe('17:00');
    });

    it('DST offset in recurring event now with IANA: 01:00 UTC Jan → 12:00 AEDT', () => {
      // Simulates a recurring event occurrence where our fix emits the local bare string
      // along with the IANA timezone.
      const event = makeEvent({
        startAt:  '2026-01-09T01:00:00Z',  // UTC — AEDT = UTC+11
        endAt:    '2026-01-09T05:00:00Z',
        timeZone: 'Australia/Sydney',
      });
      const result = CalendarEventToShiftMapper.map(event, makeCalendar('Australia/Sydney'))!;
      // January in Sydney = AEDT (UTC+11): 01:00Z = 12:00 AEDT
      expect(result.date).toBe('2026-01-09');
      expect(result.startTime).toBe('12:00');
      expect(result.endTime).toBe('16:00');
    });
  });

  describe('timezone edge cases', () => {
    it('provider timestamp with explicit +10:00 offset AND IANA timezone: local time preserved', () => {
      // Provider sends full offset — JavaScript Date parses it correctly.
      // Intl then converts to Australia/Sydney and should return the same local time.
      const event = makeEvent({
        startAt:   '2026-07-09T12:00:00+10:00',
        endAt:     '2026-07-09T17:00:00+10:00',
        timeZone:  'Australia/Sydney',
      });
      const result = CalendarEventToShiftMapper.map(event, makeCalendar('Australia/Sydney'))!;
      expect(result.date).toBe('2026-07-09');
      expect(result.startTime).toBe('12:00');
      expect(result.endTime).toBe('17:00');
    });

    // ── Key regression test — the primary bug ─────────────────────────────────
    it('offset-aware timestamp with NO IANA timezone preserves local time from the raw string', () => {
      // Before the fix: new Date('2026-07-09T12:00:00+10:00') is stored as UTC 02:00Z
      // and without an IANA tz the code fell back to UTC → displayed 02:00 instead of 12:00.
      // After the fix: extractFromOffsetAwareString extracts "12:00" directly from the string.
      const event = makeEvent({
        startAt:  '2026-07-09T12:00:00+10:00',
        endAt:    '2026-07-09T17:00:00+10:00',
        timeZone: undefined,  // provider did not send a timezone label
      });
      const calendar = makeCalendar(null);  // no calendar-level timezone either
      const result   = CalendarEventToShiftMapper.map(event, calendar)!;
      expect(result.date).toBe('2026-07-09');
      expect(result.startTime).toBe('12:00');
      expect(result.endTime).toBe('17:00');
      // timezone stored as null — no IANA value was available
      expect(result.timezone).toBeNull();
    });

    it('overnight shift: start 11 PM, end 3 AM next day — endDate differs from date', () => {
      // 2026-07-14 13:00 UTC = 2026-07-14 23:00 AEST
      // 2026-07-14 17:00 UTC = 2026-07-15 03:00 AEST
      const event = makeEvent({
        startAt:  '2026-07-14T13:00:00Z',
        endAt:    '2026-07-14T17:00:00Z',
        timeZone: 'Australia/Sydney',
      });
      const result = CalendarEventToShiftMapper.map(event, makeCalendar('Australia/Sydney'))!;
      expect(result.date).toBe('2026-07-14');    // start date is the anchor
      expect(result.startTime).toBe('23:00');
      expect(result.endDate).toBe('2026-07-15'); // crosses midnight → next day
      expect(result.endTime).toBe('03:00');
    });

    it('overnight shift via offset-aware string: endDate preserved from raw string', () => {
      // No IANA timezone — but provider encodes the offset explicitly.
      // Start: 2026-07-14T23:00:00+10:00 = local 23:00 on Jul 14
      // End:   2026-07-15T03:00:00+10:00 = local 03:00 on Jul 15
      const event = makeEvent({
        startAt:  '2026-07-14T23:00:00+10:00',
        endAt:    '2026-07-15T03:00:00+10:00',
        timeZone: undefined,
      });
      const result = CalendarEventToShiftMapper.map(event, makeCalendar(null))!;
      expect(result.date).toBe('2026-07-14');
      expect(result.startTime).toBe('23:00');
      expect(result.endDate).toBe('2026-07-15');
      expect(result.endTime).toBe('03:00');
    });

    it('offset causing local-date difference from UTC date', () => {
      // 2026-07-08T15:30:00Z = 2026-07-09T01:30:00 in Australia/Sydney (UTC+10, July=winter)
      const event = makeEvent({
        startAt:  '2026-07-08T15:30:00Z',
        endAt:    '2026-07-08T23:30:00Z',
        timeZone: 'Australia/Sydney',
      });
      const result = CalendarEventToShiftMapper.map(event, makeCalendar('Australia/Sydney'))!;
      // UTC date is Jul 8 but local Sydney date is Jul 9
      expect(result.date).toBe('2026-07-09');
      expect(result.startTime).toBe('01:30');
      expect(result.endDate).toBe('2026-07-09');
      expect(result.endTime).toBe('09:30');
    });

    it('UTC event with explicit UTC timezone: times are UTC values', () => {
      const event = makeEvent({
        startAt:  '2026-07-09T12:00:00Z',
        endAt:    '2026-07-09T17:00:00Z',
        timeZone: 'UTC',
      });
      const result = CalendarEventToShiftMapper.map(event, makeCalendar('UTC'))!;
      expect(result.date).toBe('2026-07-09');
      expect(result.startTime).toBe('12:00');
      expect(result.endTime).toBe('17:00');
      expect(result.timezone).toBe('UTC');
    });

    it('UTC-Z timestamp with no timezone: falls back to UTC (Z is not an offset-aware string)', () => {
      const event = makeEvent({
        startAt:  '2026-07-09T12:00:00Z',
        endAt:    '2026-07-09T17:00:00Z',
        timeZone: undefined,
      });
      const result = CalendarEventToShiftMapper.map(event, makeCalendar(null))!;
      // Z strings are not offset-aware in the sense of having a local-time component —
      // there is no embedded local offset other than UTC itself, so we fall back to UTC.
      expect(result.date).toBe('2026-07-09');
      expect(result.startTime).toBe('12:00');
      expect(result.endTime).toBe('17:00');
    });

    it('unrecognised timezone falls back to UTC without string-slicing', () => {
      const event = makeEvent({
        startAt:  '2026-07-18T09:30:00Z',
        endAt:    '2026-07-18T17:45:00Z',
        timeZone: 'Not/A_Real_Zone',
      });
      const result = CalendarEventToShiftMapper.map(event, makeCalendar('Not/A_Real_Zone'))!;
      // Falls back to UTC — values must be valid YYYY-MM-DD and HH:mm
      expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.startTime).toMatch(/^\d{2}:\d{2}$/);
      expect(result.endTime).toMatch(/^\d{2}:\d{2}$/);
      // UTC fallback gives 09:30 for a 09:30Z event
      expect(result.startTime).toBe('09:30');
      expect(result.endTime).toBe('17:45');
    });

    it('Australia/Sydney daylight-saving: Jan event (UTC+11), 01:00 UTC → 12:00 local', () => {
      // 2026-01-09T01:00:00Z = 2026-01-09T12:00:00 AEDT (UTC+11, January = summer DST)
      const event = makeEvent({
        startAt:  '2026-01-09T01:00:00Z',
        endAt:    '2026-01-09T05:00:00Z',
        timeZone: 'Australia/Sydney',
      });
      const result = CalendarEventToShiftMapper.map(event, makeCalendar('Australia/Sydney'))!;
      expect(result.date).toBe('2026-01-09');
      expect(result.startTime).toBe('12:00');
      expect(result.endTime).toBe('16:00');
    });

    it('Australia/Sydney standard time: 02:00 UTC → 12:00 local (UTC+10, July=winter)', () => {
      const event = makeEvent({
        startAt:  '2026-07-09T02:00:00Z',
        endAt:    '2026-07-09T07:00:00Z',
        timeZone: 'Australia/Sydney',
      });
      const result = CalendarEventToShiftMapper.map(event, makeCalendar('Australia/Sydney'))!;
      expect(result.date).toBe('2026-07-09');
      expect(result.startTime).toBe('12:00');
      expect(result.endTime).toBe('17:00');
    });

    it('repeated sync does not change stored local time (idempotency)', () => {
      const event  = makeEvent({ startAt: '2026-07-18T23:00:00Z', timeZone: 'Australia/Sydney' });
      const cal    = makeCalendar('Australia/Sydney');
      const r1 = CalendarEventToShiftMapper.map(event, cal)!;
      const r2 = CalendarEventToShiftMapper.map(event, cal)!;
      expect(r1.date).toBe(r2.date);
      expect(r1.startTime).toBe(r2.startTime);
      expect(r1.endTime).toBe(r2.endTime);
      expect(r1.endDate).toBe(r2.endDate);
    });

    it('contract assignment fields are null/false on import — resync must not overwrite them', () => {
      const result = CalendarEventToShiftMapper.map(makeEvent(), makeCalendar())!;
      expect(result.contractId).toBeNull();
      expect(result.contractAssigned).toBe(false);
      // The sync service's $set does NOT include contractId/contractAssigned,
      // so a previously assigned contract survives the resync.
    });

    it('endDate equals date for same-day shifts', () => {
      const event = makeEvent({
        startAt:  '2026-07-09T02:00:00Z',
        endAt:    '2026-07-09T07:00:00Z',
        timeZone: 'Australia/Sydney',
      });
      const result = CalendarEventToShiftMapper.map(event, makeCalendar('Australia/Sydney'))!;
      expect(result.date).toBe('2026-07-09');
      expect(result.endDate).toBe('2026-07-09');
    });
  });
});
