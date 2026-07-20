import type { CalendarFlow } from '../schemas/linked-calendar.schema';
export declare class SubscribeByUrlDto {
    connectionId: string;
    subscriptionUrl: string;
    calendarName?: string;
    description?: string;
    flow: CalendarFlow;
}
