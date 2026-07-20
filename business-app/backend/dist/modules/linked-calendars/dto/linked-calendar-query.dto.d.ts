import type { LinkedCalendarStatus, CalendarFlow } from '../schemas/linked-calendar.schema';
export declare class LinkedCalendarQueryDto {
    connectionId?: string;
    providerKey?: string;
    status?: LinkedCalendarStatus;
    flow?: CalendarFlow;
    search?: string;
}
