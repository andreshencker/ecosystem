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
    flow: CalendarFlow | null;
    linkedByUserId: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface CalendarOptionDto {
    id: string;
    calendarName: string;
    accountIdentifier: string;
    providerDisplayName: string;
    flow: CalendarFlow | null;
    status: LinkedCalendarStatus;
    accessRole: string | null;
}
export interface SetupCalendarResponseDto extends CalendarOptionDto {
    wasExisting: boolean;
}
export interface ProviderCalendarOptionDto {
    externalCalendarId: string;
    calendarName: string;
    calendarDescription: string | null;
    timezone: string | null;
    accessRole: string | null;
    isPrimary: boolean;
}
export type HolidayDiscoveryResponseDto = {
    status: 'linked';
    calendar: SetupCalendarResponseDto;
} | {
    status: 'multiple_matches';
    options: ProviderCalendarOptionDto[];
} | {
    status: 'not_found';
    options: [];
};
export type SetupAustralianHolidaysResponseDto = {
    status: 'linked';
    calendar: SetupCalendarResponseDto;
} | {
    status: 'assisted_setup_required';
    provider: string;
    connectionId: string;
    instructionsType: string;
};
