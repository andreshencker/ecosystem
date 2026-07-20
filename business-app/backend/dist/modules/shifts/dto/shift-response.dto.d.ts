import type { ShiftDocument, ShiftStatus, SyncStatus } from '../schemas/shift.schema';
export interface ShiftResponseDto {
    id: string;
    businessId: string;
    contractId: string | null;
    customerId: string | null;
    date: string;
    startTime: string;
    endDate: string | null;
    endTime: string;
    breakMinutes: number | null;
    status: ShiftStatus;
    location: string | null;
    notes: string | null;
    createdFromCalendar: boolean;
    contractAssigned: boolean;
    syncStatus: SyncStatus | null;
    linkedCalendarId: string | null;
    calendarProvider: string | null;
    calendarAccount: string | null;
    calendarName: string | null;
    title: string | null;
    allDay: boolean;
    timezone: string | null;
    createdAt: string;
    updatedAt: string;
}
export declare function toShiftResponse(doc: ShiftDocument | Record<string, any>): ShiftResponseDto;
