import type { CalendarFlow } from '../schemas/linked-calendar.schema';
export declare class LinkCalendarsDto {
    connectionId: string;
    calendarIds: string[];
    flow?: CalendarFlow | null;
}
