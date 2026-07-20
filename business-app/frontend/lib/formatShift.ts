/**
 * Presentational formatters for Shift date and time values.
 *
 * All functions are pure string operations — no Date object construction, no
 * timezone or locale conversion. The API stores date as YYYY-MM-DD and time as
 * HH:mm, both already normalized to the event's local calendar timezone by the
 * backend. These functions change only the display representation.
 *
 * IMPORTANT: Never pass these strings through `new Date(...)` for formatting.
 * The browser would reinterpret them in its own timezone and produce wrong output.
 */

/**
 * Converts an ISO date string (YYYY-MM-DD) to DD/MM/YYYY.
 * Returns '—' for missing or malformed input.
 *
 * @example
 *   formatShiftDate('2026-07-09') // '09/07/2026'
 *   formatShiftDate(null)         // '—'
 */
export function formatShiftDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '—';
  return `${match[3]}/${match[2]}/${match[1]}`;
}

/**
 * Converts an HH:mm time string (24-hour) to 12-hour format with AM/PM.
 * No leading zero on the hour. Returns '—' for missing or malformed input.
 *
 * @example
 *   formatShiftTime('06:00') // '6:00 AM'
 *   formatShiftTime('13:30') // '1:30 PM'
 *   formatShiftTime('00:00') // '12:00 AM'  (midnight)
 *   formatShiftTime('12:00') // '12:00 PM'  (noon)
 *   formatShiftTime('23:00') // '11:00 PM'
 *   formatShiftTime(null)    // '—'
 */
export function formatShiftTime(time: string | null | undefined): string {
  if (!time) return '—';
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '—';
  let h = parseInt(match[1], 10);
  const m = match[2];
  if (h < 0 || h > 23) return '—';
  const period = h < 12 ? 'AM' : 'PM';
  if (h === 0) h = 12;       // midnight → 12:xx AM
  else if (h > 12) h -= 12;  // 13–23 → 1–11 PM
  return `${h}:${m} ${period}`;
}

/**
 * Returns a human-readable "Updated N minutes ago" string from an ISO datetime.
 * Uses elapsed wall-clock time only — no timezone conversion of the displayed date.
 * Returns null for missing or unparseable input.
 */
export function formatFreshness(calculatedAt: string | null | undefined): string | null {
  if (!calculatedAt) return null;
  const elapsed = Math.floor((Date.now() - new Date(calculatedAt).getTime()) / 60_000);
  if (isNaN(elapsed) || elapsed < 0) return null;
  if (elapsed < 1)  return 'Updated just now';
  if (elapsed === 1) return 'Updated 1 minute ago';
  if (elapsed < 60)  return `Updated ${elapsed} minutes ago`;
  const hours = Math.floor(elapsed / 60);
  if (hours === 1)   return 'Updated 1 hour ago';
  return `Updated ${hours} hours ago`;
}

/**
 * Formats a start + end time pair as a readable range.
 * Works correctly for overnight shifts (endTime < startTime) because it treats
 * the values as opaque display strings — no date inference is performed.
 *
 * For all-day events pass allDay=true to get "All day" instead of a time range.
 *
 * @example
 *   formatShiftTimeRange('06:00', '10:00')          // '6:00 AM – 10:00 AM'
 *   formatShiftTimeRange('23:00', '03:00')          // '11:00 PM – 3:00 AM'
 *   formatShiftTimeRange('12:00', '00:00')          // '12:00 PM – 12:00 AM'
 *   formatShiftTimeRange('00:00', '23:59', true)    // 'All day'
 */
export function formatShiftTimeRange(
  startTime: string | null | undefined,
  endTime:   string | null | undefined,
  allDay?:   boolean,
): string {
  if (allDay) return 'All day';
  const start = formatShiftTime(startTime);
  const end   = formatShiftTime(endTime);
  if (start === '—' && end === '—') return '—';
  return `${start} – ${end}`;
}

/**
 * Formats a complete shift date + time range as a single human-readable string.
 * Handles same-day and overnight shifts. For all-day events, shows the date only.
 *
 * @example
 *   // Same-day:
 *   formatShiftDateTime('2026-07-09', '12:00', '2026-07-09', '17:00')
 *     // '09/07/2026, 12:00 PM – 5:00 PM'
 *
 *   // Overnight:
 *   formatShiftDateTime('2026-07-14', '23:00', '2026-07-15', '03:00')
 *     // '14/07/2026, 11:00 PM – 15/07/2026, 3:00 AM'
 *
 *   // All day:
 *   formatShiftDateTime('2026-07-09', '00:00', '2026-07-09', '23:59', true)
 *     // '09/07/2026 · All day'
 */
export function formatShiftDateTime(
  date:      string | null | undefined,
  startTime: string | null | undefined,
  endDate:   string | null | undefined,
  endTime:   string | null | undefined,
  allDay?:   boolean,
): string {
  const fDate = formatShiftDate(date);
  if (allDay) return `${fDate} · All day`;

  const resolvedEndDate = endDate ?? date;
  const isOvernight     = resolvedEndDate && resolvedEndDate !== date;

  const fStart = formatShiftTime(startTime);
  const fEnd   = formatShiftTime(endTime);

  if (isOvernight) {
    const fEndDate = formatShiftDate(resolvedEndDate);
    return `${fDate}, ${fStart} – ${fEndDate}, ${fEnd}`;
  }
  return `${fDate}, ${fStart} – ${fEnd}`;
}

/**
 * Formats the timezone label for display.
 * Returns the IANA timezone string as-is, or 'UTC' if null, or '—' if undefined.
 *
 * @example
 *   formatShiftTimezone('Australia/Sydney') // 'Australia/Sydney'
 *   formatShiftTimezone(null)               // 'UTC'
 *   formatShiftTimezone(undefined)          // '—'
 */
export function formatShiftTimezone(timezone: string | null | undefined): string {
  if (timezone === undefined) return '—';
  return timezone ?? 'UTC';
}
