import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { CommunicationConnectionService } from '../../../integrations/communications/connection/communication-connection.service';
import type { AvailableCalendarAccountResponseDto } from '../dto/available-calendar-account-response.dto';
import type { AvailableCalendarResponseDto } from '../dto/available-calendar-response.dto';
interface CalendarCallContext {
    decryptedToken: string;
}
export declare class CommunicationsCalendarClient {
    private readonly connections;
    private readonly http;
    private readonly config;
    private readonly logger;
    constructor(connections: CommunicationConnectionService, http: HttpService, config: ConfigService);
    private get baseUrl();
    resolveConnection(businessId: string): Promise<CalendarCallContext>;
    listCalendarAccounts(businessId: string): Promise<AvailableCalendarAccountResponseDto[]>;
    listCalendars(businessId: string, connectionId: string): Promise<Array<Pick<AvailableCalendarResponseDto, 'externalCalendarId' | 'calendarName' | 'calendarDescription' | 'timezone' | 'accessRole' | 'isPrimary'>>>;
    getCalendarAccount(businessId: string, connectionId: string): Promise<AvailableCalendarAccountResponseDto | null>;
    createCalendar(businessId: string, connectionId: string, body: {
        name: string;
        description?: string;
    }): Promise<{
        externalCalendarId: string;
        calendarName: string;
        calendarDescription: string | null;
        timezone: string | null;
        accessRole: string;
        isPrimary: boolean;
    }>;
    subscribeToUrl(businessId: string, connectionId: string, body: {
        url: string;
        name?: string;
        description?: string;
    }): Promise<{
        externalCalendarId: string;
        calendarName: string;
        calendarDescription: string | null;
        timezone: string | null;
        accessRole: string;
        isPrimary: boolean;
    }>;
    listCalendarEvents(businessId: string, connectionId: string, calendarId: string, params?: {
        from?: string;
        to?: string;
        limit?: number;
    }): Promise<CommCalendarEventInfo[]>;
    createCalendarEvent(businessId: string, connectionId: string, calendarId: string, event: CommCreateEventPayload): Promise<CommCalendarEventInfo>;
    updateCalendarEvent(businessId: string, connectionId: string, calendarId: string, eventId: string, event: CommUpdateEventPayload): Promise<CommCalendarEventInfo>;
    deleteCalendarEvent(businessId: string, connectionId: string, calendarId: string, eventId: string): Promise<boolean>;
}
export interface CommCreateEventPayload {
    title: string;
    startAt: string;
    endAt: string;
    description?: string;
    location?: string;
    allDay?: boolean;
    timeZone?: string;
    attendees?: Array<{
        email: string;
        name?: string;
    }>;
}
export interface CommUpdateEventPayload {
    title?: string;
    startAt?: string;
    endAt?: string;
    description?: string;
    location?: string;
    allDay?: boolean;
    timeZone?: string;
}
export interface CommCalendarEventInfo {
    id: string;
    calendarId: string;
    title: string;
    description?: string;
    location?: string;
    startAt: string;
    endAt: string;
    allDay: boolean;
    timeZone?: string;
    status?: 'confirmed' | 'tentative' | 'cancelled';
    attendees?: Array<{
        email: string;
        name?: string;
    }>;
    organizerEmail?: string;
    uid?: string;
    raw?: Record<string, any>;
}
export {};
