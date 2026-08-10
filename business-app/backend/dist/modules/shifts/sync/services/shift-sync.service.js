"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ShiftSyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShiftSyncService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const shift_schema_1 = require("../../schemas/shift.schema");
const sync_history_schema_1 = require("../schemas/sync-history.schema");
const linked_calendars_service_1 = require("../../../linked-calendars/linked-calendars.service");
const communications_calendar_client_1 = require("../../../linked-calendars/clients/communications-calendar.client");
const communications_client_service_1 = require("../../../../integrations/communications/client/communications-client.service");
const users_service_1 = require("../../../users/users.service");
const business_intelligence_service_1 = require("../../../../integrations/business-intelligence/business-intelligence.service");
const calendar_event_to_shift_mapper_1 = require("../mappers/calendar-event-to-shift.mapper");
let ShiftSyncService = class ShiftSyncService {
    static { ShiftSyncService_1 = this; }
    shiftModel;
    historyModel;
    linkedCalendarsService;
    calendarClient;
    commClient;
    usersService;
    biService;
    logger = new common_1.Logger(ShiftSyncService_1.name);
    static DAYS_BACK = 30;
    static DAYS_FORWARD = 180;
    constructor(shiftModel, historyModel, linkedCalendarsService, calendarClient, commClient, usersService, biService) {
        this.shiftModel = shiftModel;
        this.historyModel = historyModel;
        this.linkedCalendarsService = linkedCalendarsService;
        this.calendarClient = calendarClient;
        this.commClient = commClient;
        this.usersService = usersService;
        this.biService = biService;
    }
    async syncBusiness(businessId, actor) {
        const wall = Date.now();
        const startedAt = new Date().toISOString();
        this.logger.log(`[sync] START businessId=${businessId}`);
        const query = { status: 'active', flow: 'shifts' };
        const calendars = await this.linkedCalendarsService.findAll(businessId, query);
        this.logger.log(`[sync] ${calendars.length} active shift-flow calendars`);
        const stats = [];
        for (const calendar of calendars) {
            const calStat = await this.syncCalendar(businessId, calendar);
            stats.push(calStat);
        }
        const totalCreated = stats.reduce((n, s) => n + s.created, 0);
        const totalUpdated = stats.reduce((n, s) => n + s.updated, 0);
        const totalDeleted = stats.reduce((n, s) => n + s.deleted, 0);
        const totalErrors = stats.reduce((n, s) => n + s.errors.length, 0);
        const totalDurationMs = Date.now() - wall;
        const finishedAt = new Date().toISOString();
        this.logger.log(`[sync] DONE businessId=${businessId} ` +
            `created=${totalCreated} updated=${totalUpdated} deleted=${totalDeleted} ` +
            `errors=${totalErrors} duration=${totalDurationMs}ms`);
        this.biService.syncModel(businessId, 'shift', false)
            .then((r) => this.logger.log(`[sync] BI ETL complete businessId=${businessId} inserted=${r?.inserted ?? 0} updated=${r?.updated ?? 0}`))
            .catch((err) => this.logger.warn(`[sync] BI ETL failed businessId=${businessId}: ${err?.message ?? 'unknown error'}`));
        return {
            businessId,
            calendars: stats,
            totalCreated,
            totalUpdated,
            totalDeleted,
            totalErrors,
            totalDurationMs,
            startedAt,
            finishedAt,
        };
    }
    async syncSingleCalendar(businessId, linkedCalendarId, actor) {
        const calendar = await this.linkedCalendarsService.findById(linkedCalendarId, businessId);
        if (calendar.status !== 'active') {
            throw new common_1.BadRequestException(`Calendar '${calendar.calendarName}' is not active`);
        }
        if (calendar.flow !== 'shifts') {
            throw new common_1.BadRequestException(`Calendar '${calendar.calendarName}' is not configured for shift synchronisation`);
        }
        this.logger.log(`[sync:single] START linkedCalendarId=${linkedCalendarId} businessId=${businessId}`);
        const result = await this.syncCalendar(businessId, calendar);
        this.logger.log(`[sync:single] DONE linkedCalendarId=${linkedCalendarId} ` +
            `created=${result.created} updated=${result.updated} errors=${result.errors.length}`);
        this.biService.syncModel(businessId, 'shift', false)
            .then((r) => this.logger.log(`[sync:single] BI ETL done businessId=${businessId} inserted=${r?.inserted ?? 0} updated=${r?.updated ?? 0}`))
            .catch((err) => this.logger.warn(`[sync:single] BI ETL failed businessId=${businessId}: ${err?.message ?? 'unknown'}`));
        return result;
    }
    async syncCalendar(businessId, calendar) {
        const calWall = Date.now();
        const startedAt = new Date();
        const history = await this.historyModel.create({
            businessId,
            linkedCalendarId: calendar.id,
            calendarName: calendar.calendarName,
            accountIdentifier: calendar.accountIdentifier,
            providerKey: calendar.providerKey,
            startedAt,
            status: 'running',
        });
        const errors = [];
        let eventsReceived = 0;
        let created = 0;
        let updated = 0;
        let deleted = 0;
        let skipped = 0;
        try {
            const now = new Date();
            const from = new Date(now);
            const to = new Date(now);
            from.setDate(from.getDate() - ShiftSyncService_1.DAYS_BACK);
            to.setDate(to.getDate() + ShiftSyncService_1.DAYS_FORWARD);
            let events = [];
            try {
                events = await this.calendarClient.listCalendarEvents(businessId, calendar.connectionId, calendar.externalCalendarId, { from: from.toISOString(), to: to.toISOString() });
                eventsReceived = events.length;
                this.logger.log(`[sync:${calendar.calendarName}] ${eventsReceived} events from Communications`);
            }
            catch (err) {
                const msg = `Failed to fetch events: ${err?.message ?? 'Unknown error'}`;
                errors.push(msg);
                this.logger.error(`[sync:${calendar.calendarName}] ${msg}`);
                const durationMs = Date.now() - calWall;
                await this.historyModel.findOneAndUpdate({ _id: history._id }, { $set: { finishedAt: new Date(), status: 'failed', errors, durationMs } });
                return {
                    linkedCalendarId: calendar.id,
                    calendarName: calendar.calendarName,
                    accountIdentifier: calendar.accountIdentifier,
                    eventsReceived: 0,
                    created: 0, updated: 0, deleted: 0, skipped: 0,
                    errors,
                    durationMs,
                    status: 'failed',
                };
            }
            const seenOccurrenceIds = new Set();
            for (const event of events) {
                if (!event.id) {
                    skipped++;
                    continue;
                }
                if (event.status === 'cancelled') {
                    const cancelledResult = await this.shiftModel.updateMany({
                        businessId,
                        linkedCalendarId: calendar.id,
                        externalOccurrenceId: event.id,
                        syncStatus: { $ne: 'deleted' },
                    }, { $set: { syncStatus: 'deleted', lastExternalUpdate: new Date() } }).exec();
                    deleted += cancelledResult.modifiedCount ?? 0;
                    continue;
                }
                seenOccurrenceIds.add(event.id);
                const normalized = calendar_event_to_shift_mapper_1.CalendarEventToShiftMapper.map(event, calendar);
                if (!normalized) {
                    skipped++;
                    continue;
                }
                process.stdout.write(`[SHIFT_SYNC] BUSINESS_APP_SHIFT_BEFORE_SAVE | occurrenceId=${event.id} ` +
                    `date=${normalized.date} startTime=${normalized.startTime} ` +
                    `endDate=${normalized.endDate} endTime=${normalized.endTime} ` +
                    `timezone=${normalized.timezone ?? 'null'} allDay=${normalized.allDay} ` +
                    `startInstant=${normalized.start.toISOString()} endInstant=${normalized.end.toISOString()}\n`);
                try {
                    const filter = {
                        businessId,
                        externalOccurrenceId: event.id,
                    };
                    const existingShift = await this.shiftModel
                        .findOne(filter)
                        .select('_id')
                        .lean()
                        .exec();
                    if (existingShift) {
                        await this.shiftModel.findOneAndUpdate(filter, {
                            $set: {
                                title: normalized.title,
                                description: normalized.description,
                                location: normalized.location,
                                start: normalized.start,
                                end: normalized.end,
                                date: normalized.date,
                                startTime: normalized.startTime,
                                endDate: normalized.endDate,
                                endTime: normalized.endTime,
                                allDay: normalized.allDay,
                                timezone: normalized.timezone,
                                organizer: normalized.organizer,
                                attendees: normalized.attendees,
                                lastExternalUpdate: normalized.lastExternalUpdate,
                                syncStatus: 'synced',
                                metadata: normalized.metadata,
                            },
                        }).exec();
                        updated++;
                    }
                    else {
                        await this.shiftModel.create({
                            businessId,
                            ...normalized,
                        });
                        created++;
                    }
                }
                catch (err) {
                    const msg = `Upsert failed for event ${event.id}: ${err?.message}`;
                    errors.push(msg);
                    this.logger.warn(`[sync:${calendar.calendarName}] ${msg}`);
                    skipped++;
                }
            }
            if (seenOccurrenceIds.size > 0 || eventsReceived === 0) {
                const deletedResult = await this.shiftModel.updateMany({
                    businessId,
                    linkedCalendarId: calendar.id,
                    syncStatus: { $in: ['synced', 'pending'] },
                    externalOccurrenceId: {
                        $nin: [...seenOccurrenceIds],
                    },
                }, { $set: { syncStatus: 'deleted' } }).exec();
                deleted = deletedResult.modifiedCount ?? 0;
                if (deleted > 0) {
                    this.logger.log(`[sync:${calendar.calendarName}] marked ${deleted} shifts as deleted`);
                }
            }
        }
        catch (err) {
            const msg = `Unexpected sync error: ${err?.message}`;
            errors.push(msg);
            this.logger.error(`[sync:${calendar.calendarName}] ${msg}`, err?.stack);
        }
        const durationMs = Date.now() - calWall;
        const syncStatus = errors.length > 0 && created + updated === 0 ? 'failed' : 'completed';
        await this.historyModel.findOneAndUpdate({ _id: history._id }, {
            $set: {
                finishedAt: new Date(),
                eventsReceived,
                created,
                updated,
                deleted,
                skipped,
                errors,
                durationMs,
                status: syncStatus,
            },
        }).exec();
        return {
            linkedCalendarId: calendar.id,
            calendarName: calendar.calendarName,
            accountIdentifier: calendar.accountIdentifier,
            eventsReceived,
            created,
            updated,
            deleted,
            skipped,
            errors,
            durationMs,
            status: syncStatus,
        };
    }
    async getSyncHistory(businessId, params) {
        const skip = (params.page - 1) * params.limit;
        const filter = { businessId };
        if (params.linkedCalendarId)
            filter.linkedCalendarId = params.linkedCalendarId;
        const [items, total] = await Promise.all([
            this.historyModel
                .find(filter)
                .sort({ startedAt: -1 })
                .skip(skip)
                .limit(params.limit)
                .lean()
                .exec(),
            this.historyModel.countDocuments(filter),
        ]);
        return { items, total, page: params.page, limit: params.limit };
    }
    sendSyncNotification(businessId, actor, stats, totalCreated, totalUpdated, totalDeleted, totalErrors) {
        void businessId;
        void actor;
        void stats;
        void totalCreated;
        void totalUpdated;
        void totalDeleted;
        void totalErrors;
    }
};
exports.ShiftSyncService = ShiftSyncService;
exports.ShiftSyncService = ShiftSyncService = ShiftSyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(shift_schema_1.Shift.name)),
    __param(1, (0, mongoose_1.InjectModel)(sync_history_schema_1.SyncHistory.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        linked_calendars_service_1.LinkedCalendarsService,
        communications_calendar_client_1.CommunicationsCalendarClient,
        communications_client_service_1.CommunicationsClientService,
        users_service_1.UsersService,
        business_intelligence_service_1.BusinessIntelligenceService])
], ShiftSyncService);
//# sourceMappingURL=shift-sync.service.js.map