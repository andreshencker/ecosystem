import type { CalendarFlow } from '../schemas/linked-calendar.schema';
export declare class CreateCalendarDto {
    connectionId: string;
    name: string;
    description?: string;
    flow: CalendarFlow;
}
