import type { CalendarFlow } from '../schemas/linked-calendar.schema';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PublicCalendarEntry {
  /** Stable internal key — never changes, used in API requests. */
  key:              string;
  country:          string;
  /** ISO 3166-2 region code (e.g. "AU-NSW") or "national" for whole-country calendars. */
  region:           string;
  /** Human-readable label shown in the region/state selector. */
  regionLabel:      string;
  displayName:      string;
  description:      string;
  /**
   * Verified iCal subscription URL.
   * null means no trustworthy stable URL has been verified yet — do NOT fabricate.
   */
  subscriptionUrl:  string | null;
  /** Source attribution — who provides this feed and where it was obtained from. */
  source:           string;
  /** Limitations or caveats the user should know. */
  limitations:      string | null;
  recommendedFlow:  CalendarFlow;
  /** false = hide from UI until a verified URL is added. */
  available:        boolean;
}

// ─── Australia ────────────────────────────────────────────────────────────────
//
// Source research notes (2026-07):
//
// [AU-NATIONAL]
//   Google maintains a combined "Australian Public Holidays" calendar feed
//   as part of Google Calendar's built-in "Other Calendars → Australian
//   Holidays" feature. The iCal export URL follows the documented Google
//   Calendar iCal format.
//   URL: https://calendar.google.com/calendar/ical/en.australian%23holiday%40group.v.calendar.google.com/public/basic.ics
//   Status: Available as of 2026. Google maintains this feed.
//   Limitation: Combines all Australian states — does not distinguish between
//               state-specific and national-only holidays.
//   Action: Mark available=true. Verify URL before each major release.
//
// [AU-STATE-SPECIFIC]
//   No single authoritative Australian government iCal subscription feed
//   found per state at the time of writing. The Fair Work Ombudsman and state
//   government pages publish PDF/HTML lists but not stable .ics subscription URLs.
//   Third-party aggregators (iCal.ninja, officeholidays.com) provide per-state
//   feeds but their long-term availability and accuracy cannot be guaranteed.
//   Action: Mark available=false until a stable, authoritative URL is confirmed
//   per state. See docs/calendar-catalogue-research.md for tracking.

const AU_ENTRIES: PublicCalendarEntry[] = [
  {
    key:             'au_national_public_holidays',
    country:         'AU',
    region:          'national',
    regionLabel:     'Australia — National (all states combined)',
    displayName:     'Australian Public Holidays',
    description:     'Public holidays across all Australian states and territories, combined.',
    subscriptionUrl: 'https://calendar.google.com/calendar/ical/en.australian%23holiday%40group.v.calendar.google.com/public/basic.ics',
    source:          'Google Calendar — built-in Australian Holidays feed (google.com/calendar)',
    limitations:     'Combines all states. Does not separate national vs state-specific holidays.',
    recommendedFlow: 'holidays',
    available:       true,
  },
  {
    key:             'au_act_public_holidays',
    country:         'AU',
    region:          'AU-ACT',
    regionLabel:     'Australian Capital Territory',
    displayName:     'ACT Public Holidays',
    description:     'Official public holidays for the Australian Capital Territory.',
    subscriptionUrl: null,
    source:          'Not yet sourced — ACT Government does not publish a stable iCal feed.',
    limitations:     null,
    recommendedFlow: 'holidays',
    available:       false,
  },
  {
    key:             'au_nsw_public_holidays',
    country:         'AU',
    region:          'AU-NSW',
    regionLabel:     'New South Wales',
    displayName:     'NSW Public Holidays',
    description:     'Official public holidays for New South Wales.',
    subscriptionUrl: null,
    source:          'Not yet sourced — NSW Government does not publish a stable iCal subscription URL.',
    limitations:     null,
    recommendedFlow: 'holidays',
    available:       false,
  },
  {
    key:             'au_nt_public_holidays',
    country:         'AU',
    region:          'AU-NT',
    regionLabel:     'Northern Territory',
    displayName:     'NT Public Holidays',
    description:     'Official public holidays for the Northern Territory.',
    subscriptionUrl: null,
    source:          'Not yet sourced.',
    limitations:     null,
    recommendedFlow: 'holidays',
    available:       false,
  },
  {
    key:             'au_qld_public_holidays',
    country:         'AU',
    region:          'AU-QLD',
    regionLabel:     'Queensland',
    displayName:     'Queensland Public Holidays',
    description:     'Official public holidays for Queensland.',
    subscriptionUrl: null,
    source:          'Not yet sourced — Queensland Government calendar at calendar.qld.gov.au does not expose a stable iCal subscription URL.',
    limitations:     null,
    recommendedFlow: 'holidays',
    available:       false,
  },
  {
    key:             'au_sa_public_holidays',
    country:         'AU',
    region:          'AU-SA',
    regionLabel:     'South Australia',
    displayName:     'SA Public Holidays',
    description:     'Official public holidays for South Australia.',
    subscriptionUrl: null,
    source:          'Not yet sourced.',
    limitations:     null,
    recommendedFlow: 'holidays',
    available:       false,
  },
  {
    key:             'au_tas_public_holidays',
    country:         'AU',
    region:          'AU-TAS',
    regionLabel:     'Tasmania',
    displayName:     'Tasmanian Public Holidays',
    description:     'Official public holidays for Tasmania.',
    subscriptionUrl: null,
    source:          'Not yet sourced.',
    limitations:     null,
    recommendedFlow: 'holidays',
    available:       false,
  },
  {
    key:             'au_vic_public_holidays',
    country:         'AU',
    region:          'AU-VIC',
    regionLabel:     'Victoria',
    displayName:     'Victorian Public Holidays',
    description:     'Official public holidays for Victoria.',
    subscriptionUrl: null,
    source:          'Not yet sourced.',
    limitations:     null,
    recommendedFlow: 'holidays',
    available:       false,
  },
  {
    key:             'au_wa_public_holidays',
    country:         'AU',
    region:          'AU-WA',
    regionLabel:     'Western Australia',
    displayName:     'WA Public Holidays',
    description:     'Official public holidays for Western Australia.',
    subscriptionUrl: null,
    source:          'Not yet sourced.',
    limitations:     null,
    recommendedFlow: 'holidays',
    available:       false,
  },
];

// ─── Master catalogue ─────────────────────────────────────────────────────────

export const PUBLIC_CALENDAR_CATALOGUE: PublicCalendarEntry[] = [
  ...AU_ENTRIES,
];

// ─── Accessors ────────────────────────────────────────────────────────────────

export function getCatalogueEntry(key: string): PublicCalendarEntry | undefined {
  return PUBLIC_CALENDAR_CATALOGUE.find((e) => e.key === key);
}

/** Returns only entries with verified URLs and available=true. */
export function getAvailableCatalogueEntries(country?: string): PublicCalendarEntry[] {
  return PUBLIC_CALENDAR_CATALOGUE.filter(
    (e) => e.available && e.subscriptionUrl && (!country || e.country === country),
  );
}

/** Returns all entries for a country (available and unavailable) for the UI region selector. */
export function getCatalogueByCountry(country: string): PublicCalendarEntry[] {
  return PUBLIC_CALENDAR_CATALOGUE.filter((e) => e.country === country);
}

/** Safe response shape — never exposes the subscriptionUrl to the frontend. */
export interface PublicCalendarSafeEntry {
  key:            string;
  country:        string;
  region:         string;
  regionLabel:    string;
  displayName:    string;
  description:    string;
  recommendedFlow: CalendarFlow;
  available:      boolean;
  limitations:    string | null;
}

export function toSafeEntry(entry: PublicCalendarEntry): PublicCalendarSafeEntry {
  return {
    key:             entry.key,
    country:         entry.country,
    region:          entry.region,
    regionLabel:     entry.regionLabel,
    displayName:     entry.displayName,
    description:     entry.description,
    recommendedFlow: entry.recommendedFlow,
    available:       entry.available,
    limitations:     entry.limitations,
  };
}
