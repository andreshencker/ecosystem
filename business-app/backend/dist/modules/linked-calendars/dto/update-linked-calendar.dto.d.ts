import type { LinkedCalendarStatus, CalendarFlow } from '../schemas/linked-calendar.schema';
export declare class UpdateLinkedCalendarDto {
    status?: LinkedCalendarStatus;
    flow?: CalendarFlow | null;
}
