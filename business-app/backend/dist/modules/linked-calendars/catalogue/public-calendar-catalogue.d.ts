import type { CalendarFlow } from '../schemas/linked-calendar.schema';
export interface PublicCalendarEntry {
    key: string;
    country: string;
    region: string;
    regionLabel: string;
    displayName: string;
    description: string;
    subscriptionUrl: string | null;
    source: string;
    limitations: string | null;
    recommendedFlow: CalendarFlow;
    available: boolean;
}
export declare const PUBLIC_CALENDAR_CATALOGUE: PublicCalendarEntry[];
export declare function getCatalogueEntry(key: string): PublicCalendarEntry | undefined;
export declare function getAvailableCatalogueEntries(country?: string): PublicCalendarEntry[];
export declare function getCatalogueByCountry(country: string): PublicCalendarEntry[];
export interface PublicCalendarSafeEntry {
    key: string;
    country: string;
    region: string;
    regionLabel: string;
    displayName: string;
    description: string;
    recommendedFlow: CalendarFlow;
    available: boolean;
    limitations: string | null;
}
export declare function toSafeEntry(entry: PublicCalendarEntry): PublicCalendarSafeEntry;
