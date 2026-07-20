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
var LinkedCalendarsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkedCalendarsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const linked_calendar_schema_1 = require("./schemas/linked-calendar.schema");
const contract_schema_1 = require("../contracts/schemas/contract.schema");
const linked_calendar_mapper_1 = require("./mappers/linked-calendar.mapper");
const communications_calendar_client_1 = require("./clients/communications-calendar.client");
const communications_client_service_1 = require("../../integrations/communications/client/communications-client.service");
const users_service_1 = require("../users/users.service");
const public_calendar_catalogue_1 = require("./catalogue/public-calendar-catalogue");
const calendar_setup_constants_1 = require("./catalogue/calendar-setup-constants");
const AU_HOLIDAY_NAME_PATTERNS = [
    /australian.*(public.*)?(holiday|holidays)/i,
    /australia.*(public.*)?(holiday|holidays)/i,
    /holidays?.*(australia|australian)/i,
];
let LinkedCalendarsService = LinkedCalendarsService_1 = class LinkedCalendarsService {
    model;
    contractModel;
    calendarClient;
    commClient;
    usersService;
    logger = new common_1.Logger(LinkedCalendarsService_1.name);
    constructor(model, contractModel, calendarClient, commClient, usersService) {
        this.model = model;
        this.contractModel = contractModel;
        this.calendarClient = calendarClient;
        this.commClient = commClient;
        this.usersService = usersService;
    }
    async findOrThrow(id, companyId) {
        const doc = await this.model.findOne({ _id: id, companyId }).lean().exec();
        if (!doc)
            throw new common_1.NotFoundException('Linked calendar not found');
        return doc;
    }
    async sendNotification(actor, event, data) {
        try {
            const businessName = await this.usersService
                .getCompanyDisplayName(actor.companyId)
                .catch(() => actor.companyId);
            const delivered = await this.commClient.notifyEvent({
                type: 'business',
                businessId: actor.companyId,
                event,
                email: actor.email,
                data: {
                    firstName: actor.firstName,
                    businessName,
                    actionDate: new Date().toISOString(),
                    linkedCalendarsUrl: '/settings/calendar',
                    ...data,
                },
            });
            this.logger.log(`[notification] ${event} → ${actor.email} delivered=${delivered}`);
        }
        catch (err) {
            this.logger.error(`[notification] ${event} FAILED: ${err?.message}`);
        }
    }
    async listAvailableAccounts(companyId) {
        return this.calendarClient.listCalendarAccounts(companyId);
    }
    async listAvailableCalendars(companyId, connectionId) {
        const [remote, linked] = await Promise.all([
            this.calendarClient.listCalendars(companyId, connectionId),
            this.model
                .find({ companyId, connectionId })
                .select('externalCalendarId calendarName status _id')
                .lean()
                .exec(),
        ]);
        const linkedIds = new Set(linked.map((l) => l.externalCalendarId));
        const linkedNames = new Set(linked.map((l) => l.calendarName?.toLowerCase().trim() ?? ''));
        return remote
            .filter((cal) => !linkedIds.has(cal.externalCalendarId) &&
            !linkedNames.has((cal.calendarName ?? '').toLowerCase().trim()))
            .map((cal) => ({
            ...cal,
            isLinked: false,
            linkedCalendarId: null,
            linkedStatus: null,
        }));
    }
    async findAll(companyId, query) {
        const filter = { companyId };
        if (query.connectionId)
            filter.connectionId = query.connectionId;
        if (query.providerKey)
            filter.providerKey = query.providerKey;
        if (query.status)
            filter.status = query.status;
        if (query.flow)
            filter.flow = query.flow;
        if (query.search) {
            const re = new RegExp(query.search, 'i');
            filter.$or = [
                { calendarName: re },
                { accountIdentifier: re },
                { providerKey: re },
            ];
        }
        const docs = await this.model.find(filter).sort({ createdAt: -1 }).lean().exec();
        return linked_calendar_mapper_1.LinkedCalendarMapper.toResponseList(docs);
    }
    async findById(id, companyId) {
        const doc = await this.findOrThrow(id, companyId);
        return linked_calendar_mapper_1.LinkedCalendarMapper.toResponse(doc);
    }
    async linkCalendars(companyId, dto, actor) {
        const account = await this.calendarClient.getCalendarAccount(companyId, dto.connectionId);
        if (!account) {
            throw new common_1.BadRequestException(`Calendar account '${dto.connectionId}' was not found in Communications or does not belong to this Business.`);
        }
        const remoteCals = await this.calendarClient.listCalendars(companyId, dto.connectionId);
        const remoteMap = new Map(remoteCals.map((c) => [c.externalCalendarId, c]));
        const invalidIds = dto.calendarIds.filter((id) => !remoteMap.has(id));
        if (invalidIds.length > 0) {
            throw new common_1.BadRequestException(`The following calendar IDs were not found in the selected account: ${invalidIds.join(', ')}`);
        }
        const results = [];
        let newlyLinked = 0;
        let reactivated = 0;
        for (const calId of dto.calendarIds) {
            const remote = remoteMap.get(calId);
            const $set = {
                providerKey: account.providerKey,
                providerDisplayName: account.providerDisplayName,
                accountIdentifier: account.accountIdentifier,
                calendarName: remote.calendarName,
                calendarDescription: remote.calendarDescription,
                timezone: remote.timezone,
                accessRole: remote.accessRole,
                isPrimary: remote.isPrimary,
                linkedByUserId: actor.userId,
            };
            if (dto.flow !== undefined) {
                $set.flow = dto.flow;
            }
            const doc = await this.model.findOneAndUpdate({ companyId, connectionId: dto.connectionId, externalCalendarId: calId }, {
                $set,
                $setOnInsert: {
                    companyId,
                    connectionId: dto.connectionId,
                    externalCalendarId: calId,
                    status: 'active',
                },
            }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean().exec();
            const existing = await this.model
                .findOne({ companyId, connectionId: dto.connectionId, externalCalendarId: calId })
                .select('status createdAt updatedAt')
                .lean()
                .exec();
            const wasJustCreated = existing &&
                Math.abs(new Date(existing.createdAt).getTime() - new Date(existing.updatedAt).getTime()) < 100;
            if (wasJustCreated) {
                newlyLinked++;
            }
            else if (existing?.status === 'paused') {
                reactivated++;
                await this.model.updateOne({ companyId, connectionId: dto.connectionId, externalCalendarId: calId }, { $set: { status: 'active' } }).exec();
            }
            else {
                newlyLinked++;
            }
            results.push(doc);
        }
        const totalNew = newlyLinked + reactivated;
        if (totalNew === 1) {
            const cal = remoteMap.get(dto.calendarIds[0]);
            const event = reactivated > 0
                ? 'linked_calendars.calendar_activated'
                : 'linked_calendars.calendar_linked';
            this.sendNotification(actor, event, {
                accountIdentifier: account.accountIdentifier,
                providerName: account.providerDisplayName,
                calendarName: cal.calendarName,
                calendarDescription: cal.calendarDescription ?? undefined,
                timezone: cal.timezone ?? undefined,
                accessRole: cal.accessRole ?? undefined,
            });
        }
        else if (totalNew > 1) {
            this.sendNotification(actor, 'linked_calendars.calendars_bulk_linked', {
                accountIdentifier: account.accountIdentifier,
                providerName: account.providerDisplayName,
                calendarCount: String(totalNew),
                calendarNames: dto.calendarIds
                    .map((id) => remoteMap.get(id)?.calendarName ?? id)
                    .join(', '),
            });
        }
        return linked_calendar_mapper_1.LinkedCalendarMapper.toResponseList(results);
    }
    async createAndLinkCalendar(companyId, dto, actor) {
        const account = await this.calendarClient.getCalendarAccount(companyId, dto.connectionId);
        if (!account) {
            throw new common_1.BadRequestException(`Calendar account '${dto.connectionId}' was not found or does not belong to this Business.`);
        }
        const created = await this.calendarClient.createCalendar(companyId, dto.connectionId, {
            name: dto.name.trim(),
            description: dto.description?.trim(),
        });
        const result = await this.upsertLinkedCalendar({
            companyId,
            connectionId: dto.connectionId,
            account,
            remote: created,
            flow: dto.flow,
            actor,
        });
        this.sendNotification(actor, 'linked_calendars.calendar_linked', {
            accountIdentifier: account.accountIdentifier,
            providerName: account.providerDisplayName,
            calendarName: created.calendarName,
            calendarDescription: created.calendarDescription ?? undefined,
        });
        return result;
    }
    async upsertLinkedCalendar(params) {
        const { companyId, connectionId, account, remote, flow, actor } = params;
        const existing = await this.model
            .findOne({ companyId, connectionId, externalCalendarId: remote.externalCalendarId })
            .select('_id calendarName flow status')
            .lean()
            .exec();
        if (existing) {
            const updated = await this.model
                .findOneAndUpdate({ _id: existing._id, companyId }, {
                $set: {
                    calendarName: remote.calendarName,
                    calendarDescription: remote.calendarDescription,
                    timezone: remote.timezone,
                    accessRole: remote.accessRole,
                    isPrimary: remote.isPrimary,
                    flow,
                    linkedByUserId: actor.userId,
                },
            }, { new: true })
                .lean()
                .exec();
            return linked_calendar_mapper_1.LinkedCalendarMapper.toResponse(updated);
        }
        const doc = await this.model.findOneAndUpdate({ companyId, connectionId, externalCalendarId: remote.externalCalendarId }, {
            $set: {
                providerKey: account.providerKey,
                providerDisplayName: account.providerDisplayName,
                accountIdentifier: account.accountIdentifier,
                calendarName: remote.calendarName,
                calendarDescription: remote.calendarDescription,
                timezone: remote.timezone,
                accessRole: remote.accessRole,
                isPrimary: remote.isPrimary,
                flow,
                linkedByUserId: actor.userId,
            },
            $setOnInsert: {
                companyId,
                connectionId,
                externalCalendarId: remote.externalCalendarId,
                status: 'active',
            },
        }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean().exec();
        if (!doc) {
            this.logger.error(`[upsertLinkedCalendar] Upsert returned null for companyId=${companyId} ` +
                `connectionId=${connectionId} externalCalendarId=${remote.externalCalendarId}. ` +
                `Provider-side calendar may exist without a local record — manual cleanup may be required.`);
            throw new common_1.BadRequestException('Calendar was created in the provider but could not be saved to Business App. ' +
                'Please contact support with the calendar name and account details.');
        }
        return linked_calendar_mapper_1.LinkedCalendarMapper.toResponse(doc);
    }
    async subscribeByUrl(companyId, dto, actor) {
        const account = await this.calendarClient.getCalendarAccount(companyId, dto.connectionId);
        if (!account) {
            throw new common_1.BadRequestException(`Calendar account '${dto.connectionId}' was not found or does not belong to this Business.`);
        }
        const subscribed = await this.calendarClient.subscribeToUrl(companyId, dto.connectionId, {
            url: dto.subscriptionUrl,
            name: dto.calendarName?.trim(),
            description: dto.description?.trim(),
        });
        const result = await this.upsertLinkedCalendar({
            companyId,
            connectionId: dto.connectionId,
            account,
            remote: subscribed,
            flow: dto.flow,
            actor,
        });
        this.sendNotification(actor, 'linked_calendars.calendar_linked', {
            accountIdentifier: account.accountIdentifier,
            providerName: account.providerDisplayName,
            calendarName: subscribed.calendarName,
        });
        return result;
    }
    async subscribeFromCatalogue(companyId, dto, actor) {
        const entry = (0, public_calendar_catalogue_1.getCatalogueEntry)(dto.catalogueKey);
        if (!entry) {
            throw new common_1.BadRequestException(`Unknown catalogue key: '${dto.catalogueKey}'`);
        }
        if (!entry.available || !entry.subscriptionUrl) {
            throw new common_1.BadRequestException(`The calendar "${entry.displayName}" is not currently available for subscription.`);
        }
        const account = await this.calendarClient.getCalendarAccount(companyId, dto.connectionId);
        if (!account) {
            throw new common_1.BadRequestException(`Calendar account '${dto.connectionId}' was not found or does not belong to this Business.`);
        }
        const subscribed = await this.calendarClient.subscribeToUrl(companyId, dto.connectionId, {
            url: entry.subscriptionUrl,
            name: entry.displayName,
        });
        const result = await this.upsertLinkedCalendar({
            companyId,
            connectionId: dto.connectionId,
            account,
            remote: subscribed,
            flow: dto.flow,
            actor,
        });
        this.sendNotification(actor, 'linked_calendars.calendar_linked', {
            accountIdentifier: account.accountIdentifier,
            providerName: account.providerDisplayName,
            calendarName: entry.displayName,
        });
        return result;
    }
    getCatalogueForCountry(country) {
        return (0, public_calendar_catalogue_1.getCatalogueByCountry)(country).map(public_calendar_catalogue_1.toSafeEntry);
    }
    toCalendarOption(dto, wasExisting) {
        return {
            id: dto.id,
            calendarName: dto.calendarName,
            accountIdentifier: dto.accountIdentifier,
            providerDisplayName: dto.providerDisplayName,
            flow: dto.flow,
            status: dto.status,
            accessRole: dto.accessRole ?? null,
            wasExisting,
        };
    }
    async setupPaymentCalendar(companyId, dto, actor) {
        const existing = await this.model
            .findOne({ companyId, flow: 'payments', status: 'active' })
            .lean()
            .exec();
        if (existing) {
            return this.toCalendarOption(linked_calendar_mapper_1.LinkedCalendarMapper.toResponse(existing), true);
        }
        const account = await this.calendarClient.getCalendarAccount(companyId, dto.connectionId);
        if (!account) {
            throw new common_1.BadRequestException('Calendar account not found or does not belong to this Business.');
        }
        let created;
        try {
            created = await this.calendarClient.createCalendar(companyId, dto.connectionId, {
                name: calendar_setup_constants_1.CALENDAR_SETUP_DEFAULTS.PAYMENT_CALENDAR_NAME,
                description: calendar_setup_constants_1.CALENDAR_SETUP_DEFAULTS.PAYMENT_CALENDAR_DESCRIPTION,
            });
        }
        catch (err) {
            this.logger.error(`[setupPaymentCalendar] Provider calendar creation failed: ${err?.message}`);
            throw new common_1.BadRequestException(`Could not create the payment calendar in the provider: ${err?.message ?? 'Provider request failed'}`);
        }
        const linked = await this.upsertLinkedCalendar({
            companyId,
            connectionId: dto.connectionId,
            account,
            remote: created,
            flow: 'payments',
            actor,
        });
        this.sendNotification(actor, 'linked_calendars.calendar_linked', {
            accountIdentifier: account.accountIdentifier,
            providerName: account.providerDisplayName,
            calendarName: created.calendarName,
            calendarDescription: created.calendarDescription ?? undefined,
        });
        return this.toCalendarOption(linked, false);
    }
    async setupAustralianHolidays(companyId, dto, actor) {
        const existing = await this.model
            .findOne({ companyId, flow: 'holidays', status: 'active' })
            .lean()
            .exec();
        if (existing) {
            return { status: 'linked', calendar: this.toCalendarOption(linked_calendar_mapper_1.LinkedCalendarMapper.toResponse(existing), true) };
        }
        const account = await this.calendarClient.getCalendarAccount(companyId, dto.connectionId);
        if (!account) {
            throw new common_1.BadRequestException('Calendar account not found or does not belong to this Business.');
        }
        const entry = (0, public_calendar_catalogue_1.getCatalogueEntry)(calendar_setup_constants_1.CALENDAR_SETUP_DEFAULTS.AU_HOLIDAY_CATALOGUE_KEY);
        if (!entry || !entry.available || !entry.subscriptionUrl) {
            throw new common_1.BadRequestException(calendar_setup_constants_1.CALENDAR_SETUP_DEFAULTS.AU_HOLIDAY_UNAVAILABLE_MESSAGE);
        }
        let subscribed;
        try {
            subscribed = await this.calendarClient.subscribeToUrl(companyId, dto.connectionId, {
                url: entry.subscriptionUrl,
                name: entry.displayName,
            });
        }
        catch (err) {
            const reason = err?.message ?? calendar_setup_constants_1.CALENDAR_SETUP_DEFAULTS.AU_HOLIDAY_UNAVAILABLE_MESSAGE;
            this.logger.error(`[setupAustralianHolidays] Provider subscription failed connectionId=${dto.connectionId}: ${reason}`);
            if (err instanceof common_1.UnprocessableEntityException) {
                return {
                    status: 'assisted_setup_required',
                    provider: account.providerKey,
                    connectionId: dto.connectionId,
                    instructionsType: account.providerKey === 'icloud' ? 'apple_holiday_calendar' : 'generic_holiday_calendar',
                };
            }
            if (err instanceof common_1.ServiceUnavailableException) {
                throw new common_1.ServiceUnavailableException('The calendar service is temporarily unavailable. Please try again later.');
            }
            throw err;
        }
        const linked = await this.upsertLinkedCalendar({
            companyId,
            connectionId: dto.connectionId,
            account,
            remote: subscribed,
            flow: 'holidays',
            actor,
        });
        this.sendNotification(actor, 'linked_calendars.calendar_linked', {
            accountIdentifier: account.accountIdentifier,
            providerName: account.providerDisplayName,
            calendarName: entry.displayName,
        });
        return { status: 'linked', calendar: this.toCalendarOption(linked, false) };
    }
    async discoverAustralianHolidays(companyId, dto, actor) {
        const existingHoliday = await this.model
            .findOne({ companyId, flow: 'holidays', status: 'active' })
            .lean()
            .exec();
        if (existingHoliday) {
            return {
                status: 'linked',
                calendar: this.toCalendarOption(linked_calendar_mapper_1.LinkedCalendarMapper.toResponse(existingHoliday), true),
            };
        }
        const account = await this.calendarClient.getCalendarAccount(companyId, dto.connectionId);
        if (!account) {
            throw new common_1.BadRequestException(`Calendar account '${dto.connectionId}' was not found or does not belong to this Business.`);
        }
        const providerCals = await this.calendarClient.listCalendars(companyId, dto.connectionId);
        const linkedDocs = await this.model
            .find({ companyId, connectionId: dto.connectionId })
            .lean()
            .exec();
        const linkedIds = new Set(linkedDocs.map((d) => d.externalCalendarId));
        const unlinked = providerCals.filter((c) => !linkedIds.has(c.externalCalendarId));
        const candidates = unlinked.filter((c) => AU_HOLIDAY_NAME_PATTERNS.some((re) => re.test(c.calendarName)));
        if (candidates.length === 0) {
            return { status: 'not_found', options: [] };
        }
        if (candidates.length === 1) {
            const linked = await this.upsertLinkedCalendar({
                companyId,
                connectionId: dto.connectionId,
                account,
                remote: candidates[0],
                flow: 'holidays',
                actor,
            });
            this.sendNotification(actor, 'linked_calendars.calendar_linked', {
                accountIdentifier: account.accountIdentifier,
                providerName: account.providerDisplayName,
                calendarName: candidates[0].calendarName,
            });
            return {
                status: 'linked',
                calendar: this.toCalendarOption(linked, false),
            };
        }
        const options = candidates.map((c) => ({
            externalCalendarId: c.externalCalendarId,
            calendarName: c.calendarName,
            calendarDescription: c.calendarDescription,
            timezone: c.timezone,
            accessRole: c.accessRole,
            isPrimary: c.isPrimary,
        }));
        return { status: 'multiple_matches', options };
    }
    async linkProviderCalendarAsHoliday(companyId, dto, actor) {
        const existingHoliday = await this.model
            .findOne({ companyId, flow: 'holidays', status: 'active' })
            .lean()
            .exec();
        if (existingHoliday) {
            return {
                status: 'linked',
                calendar: this.toCalendarOption(linked_calendar_mapper_1.LinkedCalendarMapper.toResponse(existingHoliday), true),
            };
        }
        const account = await this.calendarClient.getCalendarAccount(companyId, dto.connectionId);
        if (!account) {
            throw new common_1.BadRequestException(`Calendar account '${dto.connectionId}' was not found or does not belong to this Business.`);
        }
        const providerCals = await this.calendarClient.listCalendars(companyId, dto.connectionId);
        const target = providerCals.find((c) => c.externalCalendarId === dto.externalCalendarId);
        if (!target) {
            throw new common_1.BadRequestException(`Calendar '${dto.externalCalendarId}' was not found in the selected account.`);
        }
        const linked = await this.upsertLinkedCalendar({
            companyId,
            connectionId: dto.connectionId,
            account,
            remote: target,
            flow: 'holidays',
            actor,
        });
        this.sendNotification(actor, 'linked_calendars.calendar_linked', {
            accountIdentifier: account.accountIdentifier,
            providerName: account.providerDisplayName,
            calendarName: target.calendarName,
        });
        return { status: 'linked', calendar: this.toCalendarOption(linked, false) };
    }
    async updateStatus(id, companyId, dto, actor) {
        const doc = await this.findOrThrow(id, companyId);
        const oldStatus = doc.status;
        const $set = {};
        if (dto.status !== undefined && dto.status !== oldStatus) {
            $set.status = dto.status;
        }
        if (dto.flow !== undefined) {
            $set.flow = dto.flow;
        }
        if (Object.keys($set).length === 0) {
            return linked_calendar_mapper_1.LinkedCalendarMapper.toResponse(doc);
        }
        const updated = await this.model
            .findOneAndUpdate({ _id: id, companyId }, { $set }, { new: true })
            .lean()
            .exec();
        const result = linked_calendar_mapper_1.LinkedCalendarMapper.toResponse(updated);
        if ($set.status) {
            const event = $set.status === 'active'
                ? 'linked_calendars.calendar_activated'
                : 'linked_calendars.calendar_paused';
            this.sendNotification(actor, event, {
                accountIdentifier: doc.accountIdentifier,
                providerName: doc.providerDisplayName,
                calendarName: doc.calendarName,
            });
        }
        return result;
    }
    async getOptions(companyId, flow) {
        const docs = await this.model
            .find({ companyId, flow, status: 'active' })
            .select('_id calendarName accountIdentifier providerDisplayName flow status accessRole')
            .sort({ calendarName: 1 })
            .lean()
            .exec();
        return docs.map((d) => ({
            id: String(d._id),
            calendarName: d.calendarName,
            accountIdentifier: d.accountIdentifier,
            providerDisplayName: d.providerDisplayName,
            flow: d.flow,
            status: d.status,
            accessRole: d.accessRole ?? null,
        }));
    }
    async activate(id, companyId, actor) {
        return this.updateStatus(id, companyId, { status: 'active' }, actor);
    }
    async pause(id, companyId, actor) {
        return this.updateStatus(id, companyId, { status: 'paused' }, actor);
    }
    async unlink(id, companyId, actor) {
        const doc = await this.findOrThrow(id, companyId);
        const referencingContract = await this.contractModel
            .findOne({
            businessId: companyId,
            $or: [
                { 'holidayRules.calendarId': id },
                { paymentCalendarSubscriptionId: id },
            ],
        })
            .select('_id')
            .lean()
            .exec();
        if (referencingContract) {
            throw new common_1.BadRequestException('This calendar is currently used by one or more Contracts. Remove or replace it in those Contracts before removing the link.');
        }
        await this.model.deleteOne({ _id: id, companyId }).exec();
        this.sendNotification(actor, 'linked_calendars.calendar_unlinked', {
            accountIdentifier: doc.accountIdentifier,
            providerName: doc.providerDisplayName,
            calendarName: doc.calendarName,
        });
        return { deleted: true };
    }
};
exports.LinkedCalendarsService = LinkedCalendarsService;
exports.LinkedCalendarsService = LinkedCalendarsService = LinkedCalendarsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(linked_calendar_schema_1.LinkedCalendar.name)),
    __param(1, (0, mongoose_1.InjectModel)(contract_schema_1.Contract.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        communications_calendar_client_1.CommunicationsCalendarClient,
        communications_client_service_1.CommunicationsClientService,
        users_service_1.UsersService])
], LinkedCalendarsService);
//# sourceMappingURL=linked-calendars.service.js.map