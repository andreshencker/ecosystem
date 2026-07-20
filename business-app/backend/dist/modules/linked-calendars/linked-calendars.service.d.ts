import { Model } from 'mongoose';
import { LinkedCalendarDocument } from './schemas/linked-calendar.schema';
import { CommunicationsCalendarClient } from './clients/communications-calendar.client';
import { CommunicationsClientService } from '../../integrations/communications/client/communications-client.service';
import { UsersService } from '../users/users.service';
import type { LinkCalendarsDto } from './dto/link-calendars.dto';
import type { CreateCalendarDto } from './dto/create-calendar.dto';
import type { SubscribeByUrlDto } from './dto/subscribe-by-url.dto';
import type { SubscribeFromCatalogueDto } from './dto/subscribe-from-catalogue.dto';
import type { UpdateLinkedCalendarDto } from './dto/update-linked-calendar.dto';
import type { LinkedCalendarQueryDto } from './dto/linked-calendar-query.dto';
import type { LinkedCalendarResponseDto, CalendarOptionDto } from './dto/linked-calendar-response.dto';
import type { AvailableCalendarAccountResponseDto } from './dto/available-calendar-account-response.dto';
import type { AvailableCalendarResponseDto } from './dto/available-calendar-response.dto';
import type { CalendarFlow } from './schemas/linked-calendar.schema';
import { type PublicCalendarSafeEntry } from './catalogue/public-calendar-catalogue';
import type { SetupCalendarDto } from './dto/setup-calendar.dto';
import type { SetupCalendarResponseDto, HolidayDiscoveryResponseDto, SetupAustralianHolidaysResponseDto } from './dto/linked-calendar-response.dto';
import type { DiscoverHolidaysDto } from './dto/discover-holidays.dto';
import type { LinkHolidayCalendarDto } from './dto/link-holiday-calendar.dto';
export interface ActorContext {
    userId: string;
    email: string;
    firstName: string;
    companyId: string;
}
export declare class LinkedCalendarsService {
    private readonly model;
    private readonly contractModel;
    private readonly calendarClient;
    private readonly commClient;
    private readonly usersService;
    private readonly logger;
    constructor(model: Model<LinkedCalendarDocument>, contractModel: Model<any>, calendarClient: CommunicationsCalendarClient, commClient: CommunicationsClientService, usersService: UsersService);
    private findOrThrow;
    private sendNotification;
    listAvailableAccounts(companyId: string): Promise<AvailableCalendarAccountResponseDto[]>;
    listAvailableCalendars(companyId: string, connectionId: string): Promise<AvailableCalendarResponseDto[]>;
    findAll(companyId: string, query: LinkedCalendarQueryDto): Promise<LinkedCalendarResponseDto[]>;
    findById(id: string, companyId: string): Promise<LinkedCalendarResponseDto>;
    linkCalendars(companyId: string, dto: LinkCalendarsDto, actor: ActorContext): Promise<LinkedCalendarResponseDto[]>;
    createAndLinkCalendar(companyId: string, dto: CreateCalendarDto, actor: ActorContext): Promise<LinkedCalendarResponseDto>;
    private upsertLinkedCalendar;
    subscribeByUrl(companyId: string, dto: SubscribeByUrlDto, actor: ActorContext): Promise<LinkedCalendarResponseDto>;
    subscribeFromCatalogue(companyId: string, dto: SubscribeFromCatalogueDto, actor: ActorContext): Promise<LinkedCalendarResponseDto>;
    getCatalogueForCountry(country: string): PublicCalendarSafeEntry[];
    private toCalendarOption;
    setupPaymentCalendar(companyId: string, dto: SetupCalendarDto, actor: ActorContext): Promise<SetupCalendarResponseDto>;
    setupAustralianHolidays(companyId: string, dto: SetupCalendarDto, actor: ActorContext): Promise<SetupAustralianHolidaysResponseDto>;
    discoverAustralianHolidays(companyId: string, dto: DiscoverHolidaysDto, actor: ActorContext): Promise<HolidayDiscoveryResponseDto>;
    linkProviderCalendarAsHoliday(companyId: string, dto: LinkHolidayCalendarDto, actor: ActorContext): Promise<SetupAustralianHolidaysResponseDto>;
    updateStatus(id: string, companyId: string, dto: UpdateLinkedCalendarDto, actor: ActorContext): Promise<LinkedCalendarResponseDto>;
    getOptions(companyId: string, flow: CalendarFlow): Promise<CalendarOptionDto[]>;
    activate(id: string, companyId: string, actor: ActorContext): Promise<LinkedCalendarResponseDto>;
    pause(id: string, companyId: string, actor: ActorContext): Promise<LinkedCalendarResponseDto>;
    unlink(id: string, companyId: string, actor: ActorContext): Promise<{
        deleted: boolean;
    }>;
}
