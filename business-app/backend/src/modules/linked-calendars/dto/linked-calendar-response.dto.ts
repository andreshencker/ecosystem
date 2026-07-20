import type { LinkedCalendarStatus, CalendarFlow } from '../schemas/linked-calendar.schema';

export interface LinkedCalendarResponseDto {
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
  /** Flow assignment for this calendar subscription. null = unassigned (legacy). */
  flow: CalendarFlow | null;
  linkedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Safe subset returned by the /linked-calendars/options endpoint. Never includes credentials. */
export interface CalendarOptionDto {
  id: string;
  calendarName: string;
  accountIdentifier: string;
  providerDisplayName: string;
  flow: CalendarFlow | null;
  status: LinkedCalendarStatus;
  accessRole: string | null;
}

/** Returned by the one-click setup endpoints. Includes wasExisting for UX differentiation. */
export interface SetupCalendarResponseDto extends CalendarOptionDto {
  /** true when the returned calendar already existed (idempotency path). */
  wasExisting: boolean;
}

/** Safe provider calendar metadata returned during holiday discovery. Never contains credentials or subscription URLs. */
export interface ProviderCalendarOptionDto {
  externalCalendarId: string;
  calendarName: string;
  calendarDescription: string | null;
  timezone: string | null;
  accessRole: string | null;
  isPrimary: boolean;
}

/** Response from POST /linked-calendars/setup/australian-holidays/discover */
export type HolidayDiscoveryResponseDto =
  | { status: 'linked';           calendar: SetupCalendarResponseDto }
  | { status: 'multiple_matches'; options: ProviderCalendarOptionDto[] }
  | { status: 'not_found';        options: [] };

/**
 * Response from POST /linked-calendars/setup/australian-holidays.
 * 'linked': calendar was auto-subscribed and linked successfully.
 * 'assisted_setup_required': provider does not support automatic URL subscription; client should open the guided setup flow.
 */
export type SetupAustralianHolidaysResponseDto =
  | { status: 'linked'; calendar: SetupCalendarResponseDto }
  | { status: 'assisted_setup_required'; provider: string; connectionId: string; instructionsType: string };
