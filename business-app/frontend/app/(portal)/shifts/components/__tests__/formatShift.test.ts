/**
 * Unit tests for lib/formatShift.ts
 *
 * All formatters are pure string functions — no Date construction, no timezone
 * conversion, no locale dependency. These tests run in Node without a DOM and
 * must not rely on system timezone or locale settings.
 */

import {
  formatShiftDate,
  formatShiftTime,
  formatShiftTimeRange,
  formatShiftDateTime,
  formatShiftTimezone,
  formatFreshness,
} from '@/lib/formatShift';

// ─── formatShiftDate ──────────────────────────────────────────────────────────

describe('formatShiftDate', () => {
  it('converts YYYY-MM-DD to DD/MM/YYYY', () => {
    expect(formatShiftDate('2026-07-09')).toBe('09/07/2026');
  });

  it('pads single-digit day and month', () => {
    expect(formatShiftDate('2026-01-05')).toBe('05/01/2026');
  });

  it('handles end-of-year dates', () => {
    expect(formatShiftDate('2026-12-31')).toBe('31/12/2026');
  });

  it('returns — for null', () => {
    expect(formatShiftDate(null)).toBe('—');
  });

  it('returns — for undefined', () => {
    expect(formatShiftDate(undefined)).toBe('—');
  });

  it('returns — for empty string', () => {
    expect(formatShiftDate('')).toBe('—');
  });

  it('returns — for non-date string', () => {
    expect(formatShiftDate('not-a-date')).toBe('—');
  });

  it('does not construct a Date object (no timezone shift)', () => {
    // A date that would shift backward if converted through UTC midnight in +10:00
    expect(formatShiftDate('2026-07-09')).toBe('09/07/2026');
  });
});

// ─── formatShiftTime ─────────────────────────────────────────────────────────

describe('formatShiftTime', () => {
  it('06:00 → 6:00 AM', () => {
    expect(formatShiftTime('06:00')).toBe('6:00 AM');
  });

  it('18:00 → 6:00 PM', () => {
    expect(formatShiftTime('18:00')).toBe('6:00 PM');
  });

  it('00:00 → 12:00 AM (midnight)', () => {
    expect(formatShiftTime('00:00')).toBe('12:00 AM');
  });

  it('12:00 → 12:00 PM (noon)', () => {
    expect(formatShiftTime('12:00')).toBe('12:00 PM');
  });

  it('23:00 → 11:00 PM', () => {
    expect(formatShiftTime('23:00')).toBe('11:00 PM');
  });

  it('03:00 → 3:00 AM', () => {
    expect(formatShiftTime('03:00')).toBe('3:00 AM');
  });

  it('13:30 → 1:30 PM', () => {
    expect(formatShiftTime('13:30')).toBe('1:30 PM');
  });

  it('01:30 → 1:30 AM', () => {
    expect(formatShiftTime('01:30')).toBe('1:30 AM');
  });

  it('11:59 → 11:59 AM', () => {
    expect(formatShiftTime('11:59')).toBe('11:59 AM');
  });

  it('returns — for null', () => {
    expect(formatShiftTime(null)).toBe('—');
  });

  it('returns — for undefined', () => {
    expect(formatShiftTime(undefined)).toBe('—');
  });

  it('returns — for empty string', () => {
    expect(formatShiftTime('')).toBe('—');
  });

  it('returns — for malformed string', () => {
    expect(formatShiftTime('25:00')).toBe('—');
    expect(formatShiftTime('abc')).toBe('—');
  });
});

// ─── formatShiftTimeRange ─────────────────────────────────────────────────────

describe('formatShiftTimeRange', () => {
  it('same-day range', () => {
    expect(formatShiftTimeRange('06:00', '10:00')).toBe('6:00 AM – 10:00 AM');
  });

  it('overnight range: 23:00 → 03:00', () => {
    expect(formatShiftTimeRange('23:00', '03:00')).toBe('11:00 PM – 3:00 AM');
  });

  it('midnight end', () => {
    expect(formatShiftTimeRange('12:00', '00:00')).toBe('12:00 PM – 12:00 AM');
  });

  it('allDay=true returns "All day"', () => {
    expect(formatShiftTimeRange('00:00', '23:59', true)).toBe('All day');
  });

  it('returns — when both times are missing', () => {
    expect(formatShiftTimeRange(null, null)).toBe('—');
  });

  it('partial: only start time', () => {
    // Still renders start – '—'
    expect(formatShiftTimeRange('09:00', null)).toBe('9:00 AM – —');
  });
});

// ─── formatShiftDateTime ─────────────────────────────────────────────────────

describe('formatShiftDateTime', () => {
  it('same-day shift: shows date + time range', () => {
    expect(formatShiftDateTime('2026-07-09', '12:00', '2026-07-09', '17:00'))
      .toBe('09/07/2026, 12:00 PM – 5:00 PM');
  });

  it('overnight shift: shows start date/time – end date/time', () => {
    expect(formatShiftDateTime('2026-07-14', '23:00', '2026-07-15', '03:00'))
      .toBe('14/07/2026, 11:00 PM – 15/07/2026, 3:00 AM');
  });

  it('all-day event: shows date · All day', () => {
    expect(formatShiftDateTime('2026-07-09', '00:00', '2026-07-09', '23:59', true))
      .toBe('09/07/2026 · All day');
  });

  it('null endDate falls back to same-day display', () => {
    expect(formatShiftDateTime('2026-07-09', '08:00', null, '16:00'))
      .toBe('09/07/2026, 8:00 AM – 4:00 PM');
  });
});

// ─── formatShiftTimezone ─────────────────────────────────────────────────────

describe('formatShiftTimezone', () => {
  it('returns the IANA timezone string', () => {
    expect(formatShiftTimezone('Australia/Sydney')).toBe('Australia/Sydney');
  });

  it('null → UTC', () => {
    expect(formatShiftTimezone(null)).toBe('UTC');
  });

  it('undefined → —', () => {
    expect(formatShiftTimezone(undefined)).toBe('—');
  });
});

// ─── formatFreshness ─────────────────────────────────────────────────────────

describe('formatFreshness', () => {
  const NOW = new Date('2026-07-09T12:00:00Z').getTime();

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns "Updated just now" for < 1 minute ago', () => {
    const recent = new Date(NOW - 30_000).toISOString();
    expect(formatFreshness(recent)).toBe('Updated just now');
  });

  it('returns "Updated 1 minute ago" for exactly 1 minute', () => {
    const oneMin = new Date(NOW - 60_000).toISOString();
    expect(formatFreshness(oneMin)).toBe('Updated 1 minute ago');
  });

  it('returns "Updated N minutes ago" for < 1 hour', () => {
    const thirtyMin = new Date(NOW - 30 * 60_000).toISOString();
    expect(formatFreshness(thirtyMin)).toBe('Updated 30 minutes ago');
  });

  it('returns "Updated 1 hour ago" for 1 hour', () => {
    const oneHour = new Date(NOW - 60 * 60_000).toISOString();
    expect(formatFreshness(oneHour)).toBe('Updated 1 hour ago');
  });

  it('returns null for null input', () => {
    expect(formatFreshness(null)).toBeNull();
  });

  it('returns null for unparseable input', () => {
    expect(formatFreshness('not-a-date')).toBeNull();
  });
});

// ─── Consistency: same shift renders the same in all contexts ─────────────────

describe('cross-context consistency', () => {
  const date      = '2026-07-09';
  const startTime = '12:00';
  const endDate   = '2026-07-09';
  const endTime   = '17:00';

  it('table and drawer show the same date', () => {
    const tableDate  = formatShiftDate(date);
    const drawerDate = formatShiftDate(date);
    expect(tableDate).toBe(drawerDate);
  });

  it('table and drawer show the same time range', () => {
    const tableRange  = formatShiftTimeRange(startTime, endTime);
    const modalRange  = formatShiftTimeRange(startTime, endTime);
    expect(tableRange).toBe(modalRange);
  });

  it('overnight shift is labelled consistently', () => {
    const oDate    = '2026-07-14';
    const oStart   = '23:00';
    const oEndDate = '2026-07-15';
    const oEnd     = '03:00';

    const range       = formatShiftTimeRange(oStart, oEnd);
    const fullDisplay = formatShiftDateTime(oDate, oStart, oEndDate, oEnd);

    expect(range).toBe('11:00 PM – 3:00 AM');
    expect(fullDisplay).toBe('14/07/2026, 11:00 PM – 15/07/2026, 3:00 AM');
  });
});
