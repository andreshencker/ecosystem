export type LinkedCalendarStatus = 'active' | 'paused';

export type CalendarFlow = 'holidays' | 'shifts' | 'payments';
export const CALENDAR_FLOW_LABELS: Record<CalendarFlow, string> = {
  holidays: 'Holidays',
  shifts:   'Shifts',
  payments: 'Payments',
};

export interface AvailableCalendarAccount {
  connectionId: string;
  providerKey: string;
  providerDisplayName: string;
  accountIdentifier: string;
  isActive: boolean;
}

export interface AvailableCalendar {
  externalCalendarId: string;
  calendarName: string;
  calendarDescription: string | null;
  timezone: string | null;
  accessRole: string | null;
  isPrimary: boolean;
  isLinked: boolean;
  linkedCalendarId: string | null;
  linkedStatus: LinkedCalendarStatus | null;
}

export interface LinkedCalendar {
  id: string;
  companyId: string;
  connectionId: string;
  providerKey: string;
  providerDisplayName: string;
  accountIdentifier: string;
  externalCalendarId: string;
  calendarName: string;
  calendarDescription: string | null;
  timezone: string | null;
  accessRole: string | null;
  isPrimary: boolean;
  status: LinkedCalendarStatus;
  /** Flow assignment for this subscription. null = unassigned (legacy). */
  flow: CalendarFlow | null;
  linkedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Safe subset returned by GET /linked-calendars/options?flow=X. Never contains credentials. */
export interface CalendarOption {
  id: string;
  calendarName: string;
  accountIdentifier: string;
  providerDisplayName: string;
  flow: CalendarFlow | null;
  status: LinkedCalendarStatus;
  accessRole: string | null;
}

export interface LinkCalendarsPayload {
  connectionId: string;
  calendarIds: string[];
  /** Flow to assign on link. Optional — can be set later via PATCH. */
  flow?: CalendarFlow;
}

export interface UpdateLinkedCalendarPayload {
  status?: LinkedCalendarStatus;
  /** Send null to clear (mark unassigned). */
  flow?: CalendarFlow | null;
}

export interface LinkedCalendarsQuery {
  connectionId?: string;
  providerKey?: string;
  status?: LinkedCalendarStatus;
  flow?: CalendarFlow;
  search?: string;
}

/** Payload for POST /linked-calendars/create — create in provider and link automatically. */
export interface CreateCalendarPayload {
  connectionId: string;
  name: string;
  description?: string;
  flow: CalendarFlow;
}

/** Payload for POST /linked-calendars/subscribe-url */
export interface SubscribeByUrlPayload {
  connectionId:    string;
  subscriptionUrl: string;
  calendarName?:   string;
  description?:    string;
  flow:            CalendarFlow;
}

/** Payload for POST /linked-calendars/subscribe-catalogue */
export interface SubscribeFromCataloguePayload {
  connectionId: string;
  catalogueKey: string;
  flow:         CalendarFlow;
}

/**
 * Safe catalogue entry returned by GET /linked-calendars/catalogue.
 * Never includes the subscription URL (that stays on the backend).
 */
export interface PublicCalendarEntry {
  key:             string;
  country:         string;
  region:          string;
  regionLabel:     string;
  displayName:     string;
  description:     string;
  recommendedFlow: CalendarFlow;
  available:       boolean;
  limitations:     string | null;
}

/** Source mode for the expanded Create Calendar drawer. Frontend-only — not persisted. */
export type CalendarSource = 'create' | 'catalogue' | 'url';

/** Payload for POST /linked-calendars/setup/payment and /setup/australian-holidays. */
export interface SetupCalendarPayload {
  connectionId: string;
}

/** Response from one-click setup endpoints. */
export interface SetupCalendarResult extends CalendarOption {
  /** true when the calendar already existed and was returned without creating a new one. */
  wasExisting: boolean;
}

/** Payload for POST /linked-calendars/setup/australian-holidays/discover */
export interface DiscoverHolidaysPayload {
  connectionId: string;
}

/** Safe provider calendar returned during holiday discovery. */
export interface ProviderCalendarOption {
  externalCalendarId: string;
  calendarName: string;
  calendarDescription: string | null;
  timezone: string | null;
  accessRole: string | null;
  isPrimary: boolean;
}

/** Response from POST /linked-calendars/setup/australian-holidays/discover */
export type HolidayDiscoveryResult =
  | { status: 'linked';           calendar: SetupCalendarResult }
  | { status: 'multiple_matches'; options: ProviderCalendarOption[] }
  | { status: 'not_found';        options: [] };

/** Payload for POST /linked-calendars/setup/australian-holidays/link-selected */
export interface LinkHolidayCalendarPayload {
  connectionId: string;
  externalCalendarId: string;
}

/**
 * Response from POST /linked-calendars/setup/australian-holidays.
 * 'linked': auto-subscribed and linked successfully.
 * 'assisted_setup_required': provider cannot subscribe automatically; client opens guided setup.
 */
export type SetupAustralianHolidaysResult =
  | { status: 'linked'; calendar: SetupCalendarResult }
  | { status: 'assisted_setup_required'; provider: string; connectionId: string; instructionsType: string };
