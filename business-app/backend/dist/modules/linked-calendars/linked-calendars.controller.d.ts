import { LinkedCalendarsService } from './linked-calendars.service';
import { LinkCalendarsDto } from './dto/link-calendars.dto';
import { CreateCalendarDto } from './dto/create-calendar.dto';
import { SubscribeByUrlDto } from './dto/subscribe-by-url.dto';
import { SubscribeFromCatalogueDto } from './dto/subscribe-from-catalogue.dto';
import { SetupCalendarDto } from './dto/setup-calendar.dto';
import { DiscoverHolidaysDto } from './dto/discover-holidays.dto';
import { LinkHolidayCalendarDto } from './dto/link-holiday-calendar.dto';
import { UpdateLinkedCalendarDto } from './dto/update-linked-calendar.dto';
import { LinkedCalendarQueryDto } from './dto/linked-calendar-query.dto';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import type { CalendarFlow } from './schemas/linked-calendar.schema';
export declare class LinkedCalendarsController {
    private readonly service;
    constructor(service: LinkedCalendarsService);
    private resolveContext;
    listAccounts(ctx: AuthContext): Promise<{
        data: import("./dto/available-calendar-account-response.dto").AvailableCalendarAccountResponseDto[];
    }>;
    listAccountCalendars(ctx: AuthContext, connectionId: string): Promise<{
        data: import("./dto/available-calendar-response.dto").AvailableCalendarResponseDto[];
    }>;
    getOptions(ctx: AuthContext, flow: CalendarFlow): Promise<{
        data: import("./dto/linked-calendar-response.dto").CalendarOptionDto[];
    }>;
    findAll(ctx: AuthContext, query: LinkedCalendarQueryDto): Promise<{
        data: import("./dto/linked-calendar-response.dto").LinkedCalendarResponseDto[];
        total: number;
    }>;
    findOne(ctx: AuthContext, id: string): Promise<import("./dto/linked-calendar-response.dto").LinkedCalendarResponseDto>;
    linkCalendars(ctx: AuthContext, dto: LinkCalendarsDto): Promise<{
        data: import("./dto/linked-calendar-response.dto").LinkedCalendarResponseDto[];
    }>;
    createCalendar(ctx: AuthContext, dto: CreateCalendarDto): Promise<import("./dto/linked-calendar-response.dto").LinkedCalendarResponseDto>;
    subscribeByUrl(ctx: AuthContext, dto: SubscribeByUrlDto): Promise<import("./dto/linked-calendar-response.dto").LinkedCalendarResponseDto>;
    subscribeFromCatalogue(ctx: AuthContext, dto: SubscribeFromCatalogueDto): Promise<import("./dto/linked-calendar-response.dto").LinkedCalendarResponseDto>;
    getCatalogue(ctx: AuthContext, country?: string): Promise<{
        data: import("./catalogue/public-calendar-catalogue").PublicCalendarSafeEntry[];
    }>;
    setupPaymentCalendar(ctx: AuthContext, dto: SetupCalendarDto): Promise<import("./dto/linked-calendar-response.dto").SetupCalendarResponseDto>;
    setupAustralianHolidays(ctx: AuthContext, dto: SetupCalendarDto): Promise<import("./dto/linked-calendar-response.dto").SetupAustralianHolidaysResponseDto>;
    discoverAustralianHolidays(ctx: AuthContext, dto: DiscoverHolidaysDto): Promise<import("./dto/linked-calendar-response.dto").HolidayDiscoveryResponseDto>;
    linkHolidayCalendar(ctx: AuthContext, dto: LinkHolidayCalendarDto): Promise<import("./dto/linked-calendar-response.dto").SetupAustralianHolidaysResponseDto>;
    updateStatus(ctx: AuthContext, id: string, dto: UpdateLinkedCalendarDto): Promise<import("./dto/linked-calendar-response.dto").LinkedCalendarResponseDto>;
    activate(ctx: AuthContext, id: string): Promise<import("./dto/linked-calendar-response.dto").LinkedCalendarResponseDto>;
    pause(ctx: AuthContext, id: string): Promise<import("./dto/linked-calendar-response.dto").LinkedCalendarResponseDto>;
    unlink(ctx: AuthContext, id: string): Promise<{
        deleted: boolean;
    }>;
}
