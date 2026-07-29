// src/calendar/utils/caldav.util.ts

import { RRule, RRuleSet } from 'rrule';
import { XMLParser } from 'fast-xml-parser';

// Shared parser instance — namespace prefixes stripped so lookups use local names.
const _xmlParser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
});

/**
 * Resolves a CalDAV href to an absolute URL.
 *
 * CalDAV servers (including Apple iCloud) return RELATIVE hrefs in their
 * PROPFIND responses (e.g. /18403342244/principal/).  This function makes
 * them absolute so the rest of the workflow can call fetch() without errors.
 *
 *   relative  →  origin + href
 *   absolute  →  unchanged
 */
export function resolveHref(href: string, origin: string): string {
  const h = href.trim();
  if (!h) return '';
  if (/^https?:\/\//i.test(h)) return h;
  if (h.startsWith('/')) return `${origin.replace(/\/$/, '')}${h}`;
  return h;
}

/**
 * Parses a CalDAV PROPFIND XML response with fast-xml-parser and extracts
 * the text content of the <href> element nested inside the named property.
 *
 * Example — extracts "/18403342244/principal/" from:
 *   <D:current-user-principal>
 *     <D:href>/18403342244/principal/</D:href>
 *   </D:current-user-principal>
 *
 * Returns the raw href string (may be relative). Combine with resolveHref()
 * to obtain an absolute URL.
 */
export function extractHrefFromProp(xml: string, propName: string): string {
  let parsed: unknown;
  try {
    parsed = _xmlParser.parse(xml);
  } catch {
    return '';
  }
  return _searchPropHref(parsed, propName.toLowerCase()) ?? '';
}

function _searchPropHref(node: unknown, propName: string): string | undefined {
  if (typeof node !== 'object' || node === null) return undefined;
  for (const [rawKey, value] of Object.entries(
    node as Record<string, unknown>,
  )) {
    // removeNSPrefix strips "D:", "C:", etc., but guard with split just in case.
    const localKey = rawKey.split(':').pop()!.toLowerCase();
    if (localKey === propName) {
      return _extractNestedHref(value);
    }
    const found = _searchPropHref(value, propName);
    if (found !== undefined) return found;
  }
  return undefined;
}

function _extractNestedHref(node: unknown): string | undefined {
  if (typeof node !== 'object' || node === null) return undefined;
  for (const [rawKey, value] of Object.entries(
    node as Record<string, unknown>,
  )) {
    const localKey = rawKey.split(':').pop()!.toLowerCase();
    if (localKey === 'href') {
      return typeof value === 'string' ? value.trim() : String(value).trim();
    }
    const found = _extractNestedHref(value);
    if (found !== undefined) return found;
  }
  return undefined;
}

export function basicAuthHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

export function buildPropfindBody(props: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:A="http://apple.com/ns/ical/">
  <D:prop>
    ${props.join('\n    ')}
  </D:prop>
</D:propfind>`;
}

export function buildCalendarQueryBody(
  timeMin?: string,
  timeMax?: string,
): string {
  const timeRange =
    timeMin || timeMax
      ? `<C:time-range${timeMin ? ` start="${toCalDAVDate(timeMin)}"` : ''}${timeMax ? ` end="${toCalDAVDate(timeMax)}"` : ''}/>`
      : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop><D:getetag/><C:calendar-data/></D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">${timeRange}</C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`;
}

export function buildMkCalendarBody(
  name: string,
  description?: string,
  color?: string,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<C:mkcalendar xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:A="http://apple.com/ns/ical/">
  <D:set><D:prop>
    <D:displayname>${escapeXml(name)}</D:displayname>
    ${description ? `<C:calendar-description>${escapeXml(description)}</C:calendar-description>` : ''}
    ${color ? `<A:calendar-color>${escapeXml(color)}</A:calendar-color>` : ''}
  </D:prop></D:set>
</C:mkcalendar>`;
}

/**
 * Builds the MKCALENDAR request body for creating an iCloud subscribed calendar.
 *
 * Uses Apple's CalendarServer `<CS:source>` extension to attach the external
 * iCal feed URL. The URL is converted from https:// to webcal:// because iCloud
 * CalDAV expects the webcal scheme for subscription sources.
 *
 * If iCloud rejects this with a 4xx, the caller should fall back to a plain
 * MKCALENDAR (i.e., `buildMkCalendarBody`) and inform the user that URL
 * subscription is not supported.
 */
export function buildMkSubscribedCalendarBody(
  name: string,
  icsUrl: string,
): string {
  // iCloud CalDAV expects webcal:// for subscribed calendar sources
  const webcalUrl = icsUrl.replace(/^https?:\/\//i, 'webcal://');
  return `<?xml version="1.0" encoding="UTF-8"?>
<C:mkcalendar xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:CS="http://calendarserver.org/ns/">
  <D:set><D:prop>
    <D:displayname>${escapeXml(name)}</D:displayname>
    <CS:source><D:href>${escapeXml(webcalUrl)}</D:href></CS:source>
  </D:prop></D:set>
</C:mkcalendar>`;
}

export function buildProppatchBody(props: Record<string, string>): string {
  const sets = Object.entries(props)
    .map(([k, v]) => `<${k}>${escapeXml(v)}</${k}>`)
    .join('\n    ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<D:propertyupdate xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:A="http://apple.com/ns/ical/">
  <D:set><D:prop>${sets}</D:prop></D:set>
</D:propertyupdate>`;
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function extractHrefValues(xml: string): string[] {
  return [...xml.matchAll(/<(?:D:)?href[^>]*>(.*?)<\/(?:D:)?href>/gs)]
    .map((m) => m[1].trim())
    .filter(Boolean);
}

export function extractPropValue(xml: string, propName: string): string {
  const escaped = propName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(
      `<[A-Za-z]*:?${escaped}[^>]*>([\\s\\S]*?)<\\/[A-Za-z]*:?${escaped}>`,
      'i',
    ),
    new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, 'i'),
  ];
  for (const re of patterns) {
    const m = xml.match(re);
    if (m) return m[1].trim();
  }
  return '';
}

export function parseMultistatusResponses(
  xml: string,
): Array<{ href: string; props: string }> {
  const responseRe =
    /<(?:[A-Za-z]+:)?response[^>]*>([\s\S]*?)<\/(?:[A-Za-z]+:)?response>/gi;
  const results: Array<{ href: string; props: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = responseRe.exec(xml)) !== null) {
    const block = match[1];
    const href = extractPropValue(block, 'href');
    results.push({ href, props: block });
  }
  return results;
}

// ─── iCal / CalDAV date utilities ────────────────────────────────────────────

export function toCalDAVDate(iso: string): string {
  return iso.replace(/[-:]/g, '').replace(/\.\d+/, '').replace('Z', 'Z');
}

export function generateUID(): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).substring(2, 10);
  return `${ts}-${rnd}@grapifly.com`;
}

export function formatICalDate(iso: string, allDay: boolean): string {
  if (allDay) {
    return iso.split('T')[0].replace(/-/g, '');
  }
  return iso.replace(/[-:]/g, '').replace(/\.\d+/, '');
}

export function buildVEvent(params: {
  uid: string;
  title: string;
  startAt: string;
  endAt: string;
  description?: string;
  location?: string;
  allDay?: boolean;
  attendees?: { email: string; name?: string }[];
}): string {
  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+/, '');
  const dtStart = formatICalDate(params.startAt, params.allDay ?? false);
  const dtEnd = formatICalDate(params.endAt, params.allDay ?? false);
  const startProp = params.allDay
    ? `DTSTART;VALUE=DATE:${dtStart}`
    : `DTSTART:${dtStart}`;
  const endProp = params.allDay
    ? `DTEND;VALUE=DATE:${dtEnd}`
    : `DTEND:${dtEnd}`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Grapifly//CalendarAPI//EN',
    'BEGIN:VEVENT',
    `UID:${params.uid}`,
    `DTSTAMP:${now}`,
    startProp,
    endProp,
    `SUMMARY:${foldICalLine(params.title)}`,
    ...(params.description
      ? [`DESCRIPTION:${foldICalLine(params.description)}`]
      : []),
    ...(params.location ? [`LOCATION:${foldICalLine(params.location)}`] : []),
    ...(params.attendees?.map(
      (a) => `ATTENDEE;CN=${a.name ?? a.email}:mailto:${a.email}`,
    ) ?? []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

export function foldICalLine(str: string): string {
  return str.replace(/\n/g, '\\n').replace(/\r/g, '');
}

/**
 * Unfolds RFC 5545 line folding.
 *
 * iCalendar allows long lines to be split by inserting CRLF (or LF) followed
 * by a single whitespace character (SPACE or TAB).  The continuation whitespace
 * must be stripped when reassembling the logical line.
 *
 * Example:
 *   SUMMARY:A very long title that is fo
 *    lded here
 * → SUMMARY:A very long title that is folded here
 */
function unfoldIcal(ical: string): string {
  // Normalise line endings to LF first, then remove fold markers
  return ical
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n[ \t]/g, ''); // RFC 5545 §3.1 — CRLF + WSP → removed
}

// ─── Timezone conversion ──────────────────────────────────────────────────────

/**
 * Converts a UTC Date to a bare local datetime string in the given IANA timezone.
 * Output format: YYYY-MM-DDTHH:mm:ss (no Z, no offset suffix).
 *
 * This is the inverse of tzLocalToUTC.  Used to re-express rrule-generated UTC
 * occurrence times as local calendar times that match the original DTSTART;TZID=.
 */
export function utcToLocalDateTimeString(utc: Date, tzid: string): string {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tzid,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = Object.fromEntries(
      fmt.formatToParts(utc).map((p) => [p.type, p.value]),
    );
    const h = parts.hour === '24' ? '00' : parts.hour;
    return `${parts.year}-${parts.month}-${parts.day}T${h}:${parts.minute}:${parts.second}`;
  } catch {
    // Unknown IANA timezone — fall back to UTC ISO string (ends with Z)
    return utc.toISOString().replace(/\.\d+/, '');
  }
}

/**
 * Converts a local time in the given IANA timezone to a UTC Date.
 * Uses Intl.DateTimeFormat to find the UTC offset at that point in time.
 */
function tzLocalToUTC(
  year: number,
  month: number, // 0-indexed
  day: number,
  hour: number,
  minute: number,
  second: number,
  tzid: string,
): Date {
  try {
    // Use the local time as an approximate UTC seed, then correct for offset.
    const approxUTC = new Date(
      Date.UTC(year, month, day, hour, minute, second),
    );
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tzid,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = fmt.formatToParts(approxUTC);
    const getP = (type: string): number =>
      parseInt(parts.find((p) => p.type === type)?.value ?? '0');

    const fmtYear = getP('year');
    const fmtMonth = getP('month') - 1;
    const fmtDay = getP('day');
    const fmtHour = getP('hour') % 24; // guard against hour=24 edge case
    const fmtMin = getP('minute');
    const fmtSec = getP('second');

    // What UTC time does this approximate seed look like in the target timezone?
    const computedLocal = new Date(
      Date.UTC(fmtYear, fmtMonth, fmtDay, fmtHour, fmtMin, fmtSec),
    );
    // Offset correction: actual UTC = approxUTC + (approxUTC - computedLocal)
    const offsetMs = approxUTC.getTime() - computedLocal.getTime();
    return new Date(approxUTC.getTime() + offsetMs);
  } catch {
    // Unknown timezone — treat as UTC
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }
}

/**
 * Converts a raw iCal date string to a UTC Date.
 *
 * Accepted formats:
 *   20260713           → all-day date (midnight UTC)
 *   20260713T120000Z   → UTC datetime
 *   20260713T120000    → floating / TZID-qualified datetime
 *
 * @param raw   The raw value from the iCal property (after the colon).
 * @param tzid  TZID parameter value (e.g. "America/New_York"), if present.
 */
export function icalRawToUTCDate(raw: string, tzid?: string): Date | null {
  if (!raw) return null;
  const r = raw.trim();

  // All-day: YYYYMMDD (exactly 8 digits, no T)
  if (/^\d{8}$/.test(r)) {
    return new Date(
      Date.UTC(
        parseInt(r.slice(0, 4)),
        parseInt(r.slice(4, 6)) - 1,
        parseInt(r.slice(6, 8)),
      ),
    );
  }

  // Date-time: YYYYMMDDTHHmmss[Z]
  if (r.length >= 15 && r[8] === 'T') {
    const y = parseInt(r.slice(0, 4));
    const mo = parseInt(r.slice(4, 6)) - 1;
    const d = parseInt(r.slice(6, 8));
    const h = parseInt(r.slice(9, 11));
    const mi = parseInt(r.slice(11, 13));
    const s = parseInt(r.slice(13, 15) || '0');

    if (r.endsWith('Z')) {
      return new Date(Date.UTC(y, mo, d, h, mi, s));
    } else if (tzid) {
      return tzLocalToUTC(y, mo, d, h, mi, s, tzid);
    } else {
      // Floating time — treat as UTC
      return new Date(Date.UTC(y, mo, d, h, mi, s));
    }
  }

  // Fallback: standard Date parsing
  try {
    const d = new Date(r);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

// ─── VEVENT parser ────────────────────────────────────────────────────────────

export function parseVEvents(ical: string): Array<{
  uid: string;
  summary: string;
  dtstart: string;
  dtend: string;
  description: string;
  location: string;
  status: string;
  url: string;
  rrule?: string;
  recurrenceId?: string;
  exdate?: string;
  // Fields added for RRULE expansion:
  dtStartRaw: string;
  dtStartTzid?: string;
  dtEndRaw: string;
  exdateLines: Array<{ tzid?: string; values: string[] }>;
}> {
  // Unfold before any extraction so multi-line properties are handled correctly
  const unfolded = unfoldIcal(ical);

  const events: ReturnType<typeof parseVEvents> = [];
  const veventRe = /BEGIN:VEVENT\n([\s\S]*?)\nEND:VEVENT/g;
  let match: RegExpExecArray | null;

  while ((match = veventRe.exec(unfolded)) !== null) {
    const block = match[1];

    /**
     * Extract the VALUE part of a property line, respecting parameters.
     *
     * Handles all these forms:
     *   DTSTART:20240115T090000Z
     *   DTSTART;TZID=Australia/Sydney:20240115T090000
     *   DTSTART;VALUE=DATE:20240115
     *   SUMMARY:Meeting with\, client
     */
    const get = (prop: string): string => {
      const re = new RegExp(`^${prop}(?:;[^:]*)?:(.*)$`, 'im');
      const m = block.match(re);
      if (!m) return '';
      return m[1]
        .replace(/\\n/g, '\n') // iCal escaped newlines
        .replace(/\\,/g, ',') // iCal escaped commas
        .replace(/\\;/g, ';') // iCal escaped semicolons
        .replace(/\\/g, '') // remaining backslash escapes
        .trim();
    };

    // Extract TZID from a property's parameter list
    const getTzidParam = (prop: string): string | undefined => {
      const re = new RegExp(`^${prop}([^:]*)`, 'im');
      const m = block.match(re);
      if (!m) return undefined;
      const params = m[1]; // e.g. ";TZID=America/New_York"
      const tzidM = params.match(/TZID=([^;:,\s]+)/i);
      return tzidM ? tzidM[1].trim() : undefined;
    };

    // Collect ALL EXDATE property lines (there can be more than one)
    const getExdateLines = (): Array<{ tzid?: string; values: string[] }> => {
      const re = /^EXDATE([^:]*):(.*?)$/gim;
      const results: Array<{ tzid?: string; values: string[] }> = [];
      let m: RegExpExecArray | null;
      while ((m = re.exec(block)) !== null) {
        const params = m[1]; // e.g. ";TZID=America/New_York"
        const rawVals = m[2].trim();
        const tzidM = params.match(/TZID=([^;:,\s]+)/i);
        const tzid = tzidM ? tzidM[1].trim() : undefined;
        const values = rawVals
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean);
        results.push({ tzid, values });
      }
      return results;
    };

    const dtstart = get('DTSTART');
    const dtend = get('DTEND');

    events.push({
      uid: get('UID'),
      summary: get('SUMMARY'),
      dtstart: convertICalDate(dtstart),
      dtend: convertICalDate(dtend),
      description: get('DESCRIPTION'),
      location: get('LOCATION'),
      status: get('STATUS').toLowerCase() || 'confirmed',
      url: get('URL'),
      rrule: get('RRULE') || undefined,
      recurrenceId: get('RECURRENCE-ID') || undefined,
      exdate: get('EXDATE') || undefined,
      // Expansion fields
      dtStartRaw: dtstart,
      dtStartTzid: getTzidParam('DTSTART'),
      dtEndRaw: dtend,
      exdateLines: getExdateLines(),
    });
  }
  return events;
}

export function convertICalDate(icalDate: string): string {
  if (!icalDate) return '';

  const raw = icalDate.trim();

  // DATE-only format: YYYYMMDD  (length 8, no 'T')
  if (raw.length === 8 && !raw.includes('T')) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }

  // DATE-TIME format: YYYYMMDDTHHmmss[Z]
  // Also handles TZID-qualified times like "20240115T090000" (without Z)
  const tPos = raw.indexOf('T');
  if (tPos === 8) {
    const datePart = raw.slice(0, 8);
    const timePart = raw.slice(9); // skip the 'T'
    const y = datePart.slice(0, 4);
    const mo = datePart.slice(4, 6);
    const d = datePart.slice(6, 8);
    const h = timePart.slice(0, 2);
    const mi = timePart.slice(2, 4);
    const s = timePart.slice(4, 6) || '00';
    const z = raw.endsWith('Z') ? 'Z' : '';
    return `${y}-${mo}-${d}T${h}:${mi}:${s}${z}`;
  }

  // ISO date already (passed through directly)
  if (raw.includes('-')) return raw;

  return raw;
}

// ─── Calendar-level timezone extraction ──────────────────────────────────────

/**
 * Extracts the calendar-level timezone from an ICS feed string.
 *
 * Priority:
 *   1. X-WR-TIMEZONE property (Apple/Google extension, universally supported)
 *   2. First VTIMEZONE TZID declaration (RFC 5545 §3.6.5)
 *
 * Used as a fallback timezone for events that have no per-event TZID parameter.
 * This covers feeds (e.g. LASSO, Airtable) that export UTC-Z timestamps and rely
 * on the calendar-level timezone to convey the intended local context.
 *
 * Returns null when no calendar-level timezone can be determined.
 */
export function extractCalendarTimezone(ical: string): string | null {
  // 1. X-WR-TIMEZONE — simplest and most widely used
  const xwr = ical.match(/^X-WR-TIMEZONE:([^\r\n]+)/m);
  if (xwr?.[1]) return xwr[1].trim();

  // 2. First VTIMEZONE block TZID — RFC 5545 §3.6.5
  const vtz = ical.match(/^TZID:([^\r\n]+)/m);
  if (vtz?.[1]) return vtz[1].trim();

  return null;
}

// ─── RRULE expansion ──────────────────────────────────────────────────────────

export interface ExpandedVEvent {
  uid: string;
  summary: string;
  dtstart: string; // ISO 8601 — bare local datetime or UTC; see timeZone
  dtend: string; // ISO 8601 — bare local datetime or UTC; see timeZone
  description: string;
  location: string;
  status: string;
  url: string;
  rrule?: string;
  isRecurring: boolean;
  occurrenceId: string; // uid + "_" + occurrence start ISO
  /**
   * IANA timezone from the VEVENT DTSTART;TZID= parameter.
   * Present when the provider encoded a local time with a timezone identifier.
   * Consumers must use this to interpret dtstart/dtend as local time in that zone.
   * Undefined for floating times and for events already in UTC (dtstart ends with Z).
   */
  timeZone?: string;
}

type ParsedVEvent = ReturnType<typeof parseVEvents>[number];

/**
 * Expands recurring events (those with RRULE) into individual occurrences
 * within the [from, to] window.  Non-recurring events are passed through after
 * a simple date-range filter.
 *
 * Implements:
 *   - FREQ, INTERVAL, COUNT, UNTIL, BYDAY, BYMONTHDAY, BYMONTH  (via rrule library)
 *   - EXDATE exclusions
 *   - RECURRENCE-ID overrides
 *   - TZID-aware DTSTART parsing
 *   - Unique occurrenceId per instance (UID + occurrence start)
 */
export function expandVEventsInRange(
  events: ParsedVEvent[],
  from: Date,
  to: Date,
  /**
   * Calendar-level timezone fallback (from X-WR-TIMEZONE or VTIMEZONE TZID).
   * Applied to events that have no per-event DTSTART;TZID= parameter.
   * Pass the result of extractCalendarTimezone() for the ICS feed being processed.
   */
  calendarTz?: string | null,
): ExpandedVEvent[] {
  // ── 1. Classify events ─────────────────────────────────────────────────────
  const masterMap = new Map<string, ParsedVEvent>();
  const overrideMap = new Map<string, ParsedVEvent[]>();
  const standalone: ParsedVEvent[] = [];

  for (const ev of events) {
    if (ev.recurrenceId) {
      const list = overrideMap.get(ev.uid) ?? [];
      list.push(ev);
      overrideMap.set(ev.uid, list);
    } else if (ev.rrule) {
      masterMap.set(ev.uid, ev);
    } else {
      standalone.push(ev);
    }
  }

  const result: ExpandedVEvent[] = [];

  // ── 2. Non-recurring events ────────────────────────────────────────────────
  for (const ev of standalone) {
    if (!ev.dtstart) continue;
    // Range check: use icalRawToUTCDate so TZID-qualified local times are
    // compared correctly against the UTC window bounds.
    const startUtc = icalRawToUTCDate(ev.dtStartRaw, ev.dtStartTzid);
    const endUtc = ev.dtEndRaw
      ? icalRawToUTCDate(ev.dtEndRaw, ev.dtStartTzid)
      : startUtc;
    const startMs = startUtc?.getTime() ?? new Date(ev.dtstart).getTime();
    const endMs = endUtc?.getTime() ?? startMs;
    if (endMs < from.getTime() || startMs > to.getTime()) continue;

    result.push({
      uid: ev.uid,
      summary: ev.summary,
      dtstart: ev.dtstart,
      dtend: ev.dtend || ev.dtstart,
      description: ev.description,
      location: ev.location,
      status: ev.status,
      url: ev.url,
      rrule: undefined,
      isRecurring: false,
      occurrenceId: ev.uid || ev.dtstart,
      // Per-event TZID takes priority; fall back to calendar-level timezone so that
      // UTC-Z events from feeds like LASSO (which use X-WR-TIMEZONE instead of TZID)
      // carry the correct local context for conversion by downstream consumers.
      timeZone: ev.dtStartTzid ?? calendarTz ?? undefined,
    });
  }

  // ── 3. Recurring events ────────────────────────────────────────────────────
  for (const [uid, master] of masterMap) {
    const overrides = overrideMap.get(uid) ?? [];

    // Build override lookup keyed by the original occurrence UTC ms
    const overrideByMs = new Map<number, ParsedVEvent>();
    for (const ov of overrides) {
      if (!ov.recurrenceId) continue;
      const d = icalRawToUTCDate(
        ov.recurrenceId,
        ov.dtStartTzid ?? master.dtStartTzid,
      );
      if (d) overrideByMs.set(d.getTime(), ov);
    }

    // Parse DTSTART as UTC for rrule base
    const dtStartUTC = icalRawToUTCDate(master.dtStartRaw, master.dtStartTzid);
    if (!dtStartUTC) continue;

    // Compute event duration (ms) from master DTSTART/DTEND
    const durationMs = _computeDurationMs(master, dtStartUTC);
    const isAllDay = !master.dtstart.includes('T');

    // Build set of excluded UTC timestamps from all EXDATE lines
    const exdateMs = new Set<number>();
    for (const line of master.exdateLines) {
      const tzid = line.tzid ?? master.dtStartTzid;
      for (const raw of line.values) {
        const d = icalRawToUTCDate(raw, tzid);
        if (d) exdateMs.add(d.getTime());
      }
    }
    // Also handle the legacy single exdate field
    if (master.exdate && master.exdateLines.length === 0) {
      for (const raw of master.exdate.split(',')) {
        const d = icalRawToUTCDate(raw.trim(), master.dtStartTzid);
        if (d) exdateMs.add(d.getTime());
      }
    }

    // Generate occurrences using rrule
    let occurrences: Date[] = [];
    try {
      const rruleVal = master.rrule!.startsWith('RRULE:')
        ? master.rrule!.slice(6)
        : master.rrule!;
      const options = RRule.parseString(rruleVal);
      const set = new RRuleSet();
      set.rrule(new RRule({ ...options, dtstart: dtStartUTC }));
      occurrences = set.between(from, to, true);
    } catch {
      // Malformed RRULE — emit only the master occurrence if it's in range
      const masterMs = dtStartUTC.getTime();
      if (masterMs >= from.getTime() && masterMs <= to.getTime()) {
        occurrences = [dtStartUTC];
      }
    }

    for (const occ of occurrences) {
      const occMs = occ.getTime();

      // Skip EXDATE occurrences
      if (exdateMs.has(occMs)) continue;

      const override = overrideByMs.get(occMs);
      if (override) {
        // Overridden occurrence — use the override event's data
        if (!override.dtstart) continue;
        const ovStartMs = new Date(override.dtstart).getTime();
        const ovEndMs = override.dtend
          ? new Date(override.dtend).getTime()
          : ovStartMs;
        if (ovEndMs < from.getTime() || ovStartMs > to.getTime()) continue;

        result.push({
          uid: uid,
          summary: override.summary || master.summary,
          dtstart: override.dtstart,
          dtend: override.dtend || override.dtstart,
          description: override.description || master.description,
          location: override.location || master.location,
          status: override.status,
          url: override.url || master.url,
          rrule: master.rrule,
          isRecurring: true,
          occurrenceId: `${uid}_${occ.toISOString()}`,
          timeZone:
            override.dtStartTzid ??
            master.dtStartTzid ??
            calendarTz ??
            undefined,
        });
      } else {
        // Standard occurrence — rrule generates UTC Date objects.
        // Convert back to local time using the TZID (per-event or calendar fallback)
        // so the dtstart/dtend strings carry the local representation rather than
        // the UTC instant. calendarTz covers UTC-Z feeds without per-event TZID.
        const tzid = master.dtStartTzid ?? calendarTz;
        const endDate = new Date(occMs + durationMs);

        let startStr: string;
        let endStr: string;

        if (isAllDay) {
          startStr = occ.toISOString().slice(0, 10);
          endStr = endDate.toISOString().slice(0, 10);
        } else if (tzid) {
          // Re-express the UTC occurrence time as a bare local datetime in the
          // original IANA timezone so consumers can use IANA conversion correctly.
          startStr = utcToLocalDateTimeString(occ, tzid);
          endStr = utcToLocalDateTimeString(endDate, tzid);
        } else {
          // No TZID available — keep as UTC ISO (ends with Z)
          startStr = occ.toISOString();
          endStr = endDate.toISOString();
        }

        result.push({
          uid: uid,
          summary: master.summary,
          dtstart: startStr,
          dtend: endStr,
          description: master.description,
          location: master.location,
          status: master.status,
          url: master.url,
          rrule: master.rrule,
          isRecurring: true,
          occurrenceId: `${uid}_${occ.toISOString()}`,
          timeZone: tzid ?? undefined,
        });
      }
    }

    // Include overrides that move an occurrence INTO range even if the original
    // occurrence date was outside the rrule expansion window.
    for (const ov of overrides) {
      if (!ov.dtstart || !ov.recurrenceId) continue;
      const ovStartMs = new Date(ov.dtstart).getTime();
      if (ovStartMs < from.getTime() || ovStartMs > to.getTime()) continue;

      // Skip if this override was already included above
      const recIdDate = icalRawToUTCDate(
        ov.recurrenceId,
        ov.dtStartTzid ?? master.dtStartTzid,
      );
      if (
        recIdDate &&
        overrideByMs.has(recIdDate.getTime()) &&
        occurrences.some(
          (o) => Math.abs(o.getTime() - recIdDate.getTime()) < 1000,
        )
      ) {
        continue;
      }

      result.push({
        uid: uid,
        summary: ov.summary || master.summary,
        dtstart: ov.dtstart,
        dtend: ov.dtend || ov.dtstart,
        description: ov.description || master.description,
        location: ov.location || master.location,
        status: ov.status,
        url: ov.url || master.url,
        rrule: master.rrule,
        isRecurring: true,
        occurrenceId: `${uid}_${ov.dtstart}`,
        timeZone: ov.dtStartTzid ?? master.dtStartTzid,
      });
    }
  }

  // ── 4. Sort by start time ──────────────────────────────────────────────────
  result.sort((a, b) => {
    const ta = new Date(a.dtstart).getTime();
    const tb = new Date(b.dtstart).getTime();
    return isNaN(ta) || isNaN(tb) ? 0 : ta - tb;
  });

  return result;
}

function _computeDurationMs(master: ParsedVEvent, dtStartUTC: Date): number {
  if (master.dtend) {
    const endUTC = icalRawToUTCDate(master.dtEndRaw, master.dtStartTzid);
    if (endUTC) {
      const dur = endUTC.getTime() - dtStartUTC.getTime();
      if (dur >= 0) return dur;
    }
  }
  // Fallback: 1 day for all-day, 1 hour for timed
  return master.dtstart.includes('T') ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
}
