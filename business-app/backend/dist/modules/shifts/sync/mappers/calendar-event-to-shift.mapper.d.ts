import type { CommCalendarEventInfo } from '../../../linked-calendars/clients/communications-calendar.client';
import type { LinkedCalendarResponseDto } from '../../../linked-calendars/dto/linked-calendar-response.dto';
export interface NormalizedShiftFromEvent {
    linkedCalendarId: string;
    calendarProvider: string;
    calendarAccount: string;
    calendarId: string;
    calendarName: string;
    externalEventId: string;
    externalOccurrenceId: string;
    date: string;
    startTime: string;
    endTime: string;
    endDate: string;
    title: string;
    description: string | null;
    location: string | null;
    start: Date;
    end: Date;
    allDay: boolean;
    timezone: string | null;
    organizer: string | null;
    attendees: string[];
    lastExternalUpdate: Date | null;
    syncStatus: 'synced';
    createdFromCalendar: true;
    contractAssigned: false;
    hourCalculationStatus: 'pending';
    invoiceStatus: 'pending';
    status: 'draft';
    contractId: null;
    customerId: null;
    metadata: Record<string, any> | null;
}
export declare class CalendarEventToShiftMapper {
    private static toLocalDateTime;
    private static extractFromOffsetAwareString;
    private static extractFromLocalDateTimeString;
    private static resolveLocalDateTime;
    private static readonly _logger;
    static map(event: CommCalendarEventInfo, calendar: LinkedCalendarResponseDto): NormalizedShiftFromEvent | null;
}
