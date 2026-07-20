import { Model } from 'mongoose';
import { ShiftDocument } from '../../schemas/shift.schema';
import { SyncHistory, SyncHistoryDocument } from '../schemas/sync-history.schema';
import { LinkedCalendarsService } from '../../../linked-calendars/linked-calendars.service';
import { CommunicationsCalendarClient } from '../../../linked-calendars/clients/communications-calendar.client';
import { CommunicationsClientService } from '../../../../integrations/communications/client/communications-client.service';
import { UsersService } from '../../../users/users.service';
import { BusinessIntelligenceService } from '../../../../integrations/business-intelligence/business-intelligence.service';
import type { BusinessSyncResult, CalendarSyncStats } from '../interfaces/sync-result.interface';
export declare class ShiftSyncService {
    private readonly shiftModel;
    private readonly historyModel;
    private readonly linkedCalendarsService;
    private readonly calendarClient;
    private readonly commClient;
    private readonly usersService;
    private readonly biService;
    private readonly logger;
    private static readonly DAYS_BACK;
    private static readonly DAYS_FORWARD;
    constructor(shiftModel: Model<ShiftDocument>, historyModel: Model<SyncHistoryDocument>, linkedCalendarsService: LinkedCalendarsService, calendarClient: CommunicationsCalendarClient, commClient: CommunicationsClientService, usersService: UsersService, biService: BusinessIntelligenceService);
    syncBusiness(businessId: string, actor: {
        userId: string;
        email: string;
        firstName: string;
    }): Promise<BusinessSyncResult>;
    syncSingleCalendar(businessId: string, linkedCalendarId: string, actor: {
        userId: string;
        email: string;
        firstName: string;
    }): Promise<CalendarSyncStats>;
    private syncCalendar;
    getSyncHistory(businessId: string, params: {
        page: number;
        limit: number;
        linkedCalendarId?: string;
    }): Promise<{
        items: (import("mongoose").Document<unknown, {}, SyncHistory, {}, import("mongoose").DefaultSchemaOptions> & SyncHistory & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & {
            id: string;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
        total: number;
        page: number;
        limit: number;
    }>;
    private sendSyncNotification;
}
