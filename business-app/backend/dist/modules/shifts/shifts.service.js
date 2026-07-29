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
var ShiftsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShiftsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const shift_schema_1 = require("./schemas/shift.schema");
const contract_schema_1 = require("../contracts/schemas/contract.schema");
const customer_schema_1 = require("../customer/schemas/customer.schema");
const communications_client_service_1 = require("../../integrations/communications/client/communications-client.service");
const business_intelligence_service_1 = require("../../integrations/business-intelligence/business-intelligence.service");
const users_service_1 = require("../users/users.service");
const linked_calendars_service_1 = require("../linked-calendars/linked-calendars.service");
const communications_calendar_client_1 = require("../linked-calendars/clients/communications-calendar.client");
let ShiftsService = ShiftsService_1 = class ShiftsService {
    model;
    contractModel;
    customerModel;
    commClient;
    biService;
    usersService;
    linkedCalendarsService;
    calendarClient;
    logger = new common_1.Logger(ShiftsService_1.name);
    constructor(model, contractModel, customerModel, commClient, biService, usersService, linkedCalendarsService, calendarClient) {
        this.model = model;
        this.contractModel = contractModel;
        this.customerModel = customerModel;
        this.commClient = commClient;
        this.biService = biService;
        this.usersService = usersService;
        this.linkedCalendarsService = linkedCalendarsService;
        this.calendarClient = calendarClient;
    }
    async assertContractOwnership(contractId, businessId) {
        if (!mongoose_2.Types.ObjectId.isValid(contractId)) {
            throw new common_1.BadRequestException('Invalid contractId');
        }
        const contract = await this.contractModel
            .findOne({ _id: contractId, businessId })
            .lean()
            .exec();
        if (!contract) {
            throw new common_1.NotFoundException('Contract not found or does not belong to this business');
        }
        return contract;
    }
    async _summaryFromContractDoc(contract) {
        const customerId = contract.customerId ?? null;
        const customer = customerId
            ? await this.customerModel.findById(customerId).select('displayName').lean().exec()
            : null;
        return {
            id: String(contract._id),
            customerId,
            customerName: customer?.displayName ?? null,
            positionName: contract.positionName,
        };
    }
    async _resolveContractSummary(contractId, businessId) {
        if (!contractId)
            return null;
        const contract = await this.contractModel
            .findOne({ _id: contractId, businessId })
            .lean()
            .exec();
        if (!contract)
            return null;
        return this._summaryFromContractDoc(contract);
    }
    async _buildContractSummaryMap(shifts, businessId) {
        const contractIds = [...new Set(shifts.map((s) => s.contractId).filter(Boolean))];
        if (!contractIds.length)
            return new Map();
        const contracts = await this.contractModel
            .find({ _id: { $in: contractIds }, businessId })
            .lean()
            .exec();
        const customerIds = [...new Set(contracts.map((c) => c.customerId).filter(Boolean))];
        const customers = customerIds.length > 0
            ? await this.customerModel
                .find({ _id: { $in: customerIds } })
                .select('_id displayName')
                .lean()
                .exec()
            : [];
        const customerNameMap = new Map(customers.map((c) => [String(c._id), c.displayName ?? null]));
        const result = new Map();
        for (const contract of contracts) {
            result.set(String(contract._id), {
                id: String(contract._id),
                customerId: contract.customerId ?? null,
                customerName: customerNameMap.get(String(contract.customerId)) ?? null,
                positionName: contract.positionName,
            });
        }
        return result;
    }
    async create(businessId, dto, actor) {
        const contract = await this.assertContractOwnership(dto.contractId, businessId);
        let linkedCalendar = null;
        if (dto.linkedCalendarId) {
            const cals = await this.linkedCalendarsService.findAll(businessId, {
                status: 'active',
                flow: 'shifts',
            });
            linkedCalendar = cals.find((c) => c.id === dto.linkedCalendarId) ?? null;
            if (!linkedCalendar) {
                throw new common_1.NotFoundException(`Linked Calendar '${dto.linkedCalendarId}' not found, inactive, or not configured for Shift synchronization.`);
            }
        }
        const eventTitle = dto.title?.trim() || contract.positionName || 'Shift';
        const doc = await this.model.create({
            businessId,
            contractId: dto.contractId,
            customerId: contract.customerId,
            date: dto.date,
            startTime: dto.startTime,
            endTime: dto.endTime,
            breakTaken: dto.breakTaken ?? false,
            status: dto.status ?? 'draft',
            location: dto.location?.trim() ?? null,
            notes: dto.notes?.trim() ?? null,
            title: linkedCalendar ? eventTitle : null,
            createdFromCalendar: false,
            contractAssigned: true,
            syncStatus: linkedCalendar ? 'pending' : null,
            linkedCalendarId: linkedCalendar?.id ?? null,
            calendarProvider: linkedCalendar?.providerKey ?? null,
            calendarAccount: linkedCalendar?.accountIdentifier ?? null,
            calendarId: linkedCalendar?.externalCalendarId ?? null,
            calendarName: linkedCalendar?.calendarName ?? null,
        });
        if (linkedCalendar) {
            try {
                const endDateStr = ShiftsService_1.computeEndDateStr(dto.date, dto.startTime, dto.endTime);
                const externalEvent = await this.calendarClient.createCalendarEvent(businessId, linkedCalendar.connectionId, linkedCalendar.externalCalendarId, {
                    title: eventTitle,
                    startAt: `${dto.date}T${dto.startTime}:00`,
                    endAt: `${endDateStr}T${dto.endTime}:00`,
                    description: dto.notes ?? undefined,
                    location: dto.location ?? undefined,
                    ...(linkedCalendar.timezone ? { timeZone: linkedCalendar.timezone } : {}),
                });
                const synced = await this.model
                    .findOneAndUpdate({ _id: doc._id, businessId }, {
                    $set: {
                        externalEventId: externalEvent.uid ?? externalEvent.id,
                        externalOccurrenceId: externalEvent.id,
                        syncStatus: 'synced',
                    },
                }, { new: true })
                    .lean()
                    .exec();
                const contractSummary = await this._summaryFromContractDoc(contract).catch(() => null);
                return { ...(synced ?? doc), contractSummary };
            }
            catch (err) {
                await this.model
                    .findOneAndUpdate({ _id: doc._id, businessId }, { $set: { syncStatus: 'error' } })
                    .lean()
                    .exec()
                    .catch(() => void 0);
                this.logger.error(`[ShiftsService.create] External calendar event creation failed for shift ${doc._id}: ${err?.message}`);
                throw err;
            }
        }
        const contractSummary = await this._summaryFromContractDoc(contract).catch(() => null);
        return { ...doc, contractSummary };
    }
    async findAll(businessId, params) {
        const { page, limit, contractId, customerId, status, date, search, source, linkedCalendarId } = params;
        const skip = (page - 1) * limit;
        const filter = { businessId };
        if (contractId)
            filter.contractId = contractId;
        if (customerId)
            filter.customerId = customerId;
        if (status)
            filter.status = status;
        if (date)
            filter.date = date;
        if (linkedCalendarId)
            filter.linkedCalendarId = linkedCalendarId;
        if (source === 'calendar')
            filter.createdFromCalendar = true;
        if (source === 'manual')
            filter.createdFromCalendar = false;
        if (search?.trim()) {
            const re = new RegExp(search.trim(), 'i');
            filter.$or = [{ location: re }, { notes: re }, { title: re }];
        }
        const [items, total] = await Promise.all([
            this.model
                .find(filter)
                .sort({ date: -1, startTime: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.model.countDocuments(filter),
        ]);
        const summaryMap = await this._buildContractSummaryMap(items, businessId);
        const enriched = items.map((shift) => ({
            ...shift,
            contractSummary: summaryMap.get(String(shift.contractId)) ?? null,
        }));
        return { items: enriched, total, page, limit };
    }
    async findById(id, businessId) {
        if (!mongoose_2.Types.ObjectId.isValid(id))
            return null;
        const doc = await this.model.findOne({ _id: id, businessId }).lean().exec();
        if (!doc)
            return null;
        const contractSummary = await this._resolveContractSummary(doc.contractId, businessId);
        return { ...doc, contractSummary };
    }
    async findByIdOrThrow(id, businessId) {
        const doc = await this.findById(id, businessId);
        if (!doc)
            throw new common_1.NotFoundException('Shift not found');
        return doc;
    }
    async update(id, businessId, dto, actor) {
        const existing = await this.findByIdOrThrow(id, businessId);
        if (existing.status === 'cancelled') {
            throw new common_1.BadRequestException('Cannot update a cancelled shift');
        }
        let resolvedContract = null;
        const $set = {};
        if (dto.contractId !== undefined) {
            resolvedContract = await this.assertContractOwnership(dto.contractId, businessId);
            $set.contractId = dto.contractId;
            $set.customerId = resolvedContract.customerId ?? null;
            $set.contractAssigned = true;
        }
        if (dto.title !== undefined)
            $set.title = dto.title?.trim() ?? null;
        if (dto.date !== undefined)
            $set.date = dto.date;
        if (dto.startTime !== undefined)
            $set.startTime = dto.startTime;
        if (dto.endTime !== undefined)
            $set.endTime = dto.endTime;
        if (dto.breakTaken !== undefined)
            $set.breakTaken = dto.breakTaken;
        if (dto.location !== undefined)
            $set.location = dto.location?.trim() ?? null;
        if (dto.notes !== undefined)
            $set.notes = dto.notes?.trim() ?? null;
        const updated = await this.model
            .findOneAndUpdate({ _id: id, businessId }, { $set }, { new: true })
            .lean()
            .exec();
        if (!updated)
            throw new common_1.NotFoundException('Shift not found');
        const effectiveContractId = $set.contractId ?? existing.contractId;
        const contract = resolvedContract
            ?? await this.contractModel.findById(existing.contractId).lean().exec();
        const contractSummary = contract
            ? await this._summaryFromContractDoc(contract).catch(() => null)
            : await this._resolveContractSummary(effectiveContractId, businessId);
        const externalOccurrenceId = existing.externalOccurrenceId;
        const linkedCalendarId = existing.linkedCalendarId;
        if (externalOccurrenceId && linkedCalendarId) {
            this._pushExternalUpdate(businessId, linkedCalendarId, externalOccurrenceId, updated).catch((err) => this.logger.warn(`[ShiftsService.update] External calendar update failed for shift ${id}: ${err?.message}`));
        }
        return { ...updated, contractSummary };
    }
    static computeEndDateStr(date, startTime, endTime) {
        if (endTime < startTime) {
            const [year, month, day] = date.split('-').map(Number);
            const next = new Date(Date.UTC(year, month - 1, day + 1));
            return next.toISOString().slice(0, 10);
        }
        return date;
    }
    async _pushExternalUpdate(businessId, linkedCalendarId, eventId, shift) {
        const cals = await this.linkedCalendarsService.findAll(businessId, { status: 'active', flow: 'shifts' });
        const cal = cals.find((c) => c.id === linkedCalendarId);
        if (!cal) {
            this.logger.warn(`[_pushExternalUpdate] LinkedCalendar ${linkedCalendarId} not found or inactive for business ${businessId}`);
            return;
        }
        const date = shift.date;
        const startTime = shift.startTime;
        const endTime = shift.endTime;
        const endDateStr = date && startTime && endTime
            ? ShiftsService_1.computeEndDateStr(date, startTime, endTime)
            : date;
        await this.calendarClient.updateCalendarEvent(businessId, cal.connectionId, cal.externalCalendarId, eventId, {
            ...(shift.title ? { title: shift.title } : {}),
            ...(date && startTime ? { startAt: `${date}T${startTime}:00` } : {}),
            ...(date && endTime && endDateStr ? { endAt: `${endDateStr}T${endTime}:00` } : {}),
            ...(shift.location !== undefined ? { location: shift.location ?? undefined } : {}),
            ...(cal.timezone ? { timeZone: cal.timezone } : {}),
        });
    }
    async confirm(id, businessId, actor) {
        const doc = await this.findByIdOrThrow(id, businessId);
        const current = doc.status;
        if (current !== 'draft') {
            throw new common_1.BadRequestException(`Cannot confirm a shift with status "${current}". Only draft shifts can be confirmed.`);
        }
        const updated = await this.model
            .findOneAndUpdate({ _id: id, businessId }, { $set: { status: 'confirmed' } }, { new: true })
            .lean()
            .exec();
        if (!updated)
            throw new common_1.NotFoundException('Shift not found');
        const contract = await this.contractModel.findById(doc.contractId).lean().exec();
        const contractSummary = contract
            ? await this._summaryFromContractDoc(contract).catch(() => null)
            : null;
        return { ...updated, contractSummary };
    }
    async cancel(id, businessId, actor) {
        const doc = await this.findByIdOrThrow(id, businessId);
        const current = doc.status;
        if (current === 'cancelled') {
            throw new common_1.BadRequestException('Shift is already cancelled');
        }
        const updated = await this.model
            .findOneAndUpdate({ _id: id, businessId }, { $set: { status: 'cancelled' } }, { new: true })
            .lean()
            .exec();
        if (!updated)
            throw new common_1.NotFoundException('Shift not found');
        const contract = await this.contractModel.findById(doc.contractId).lean().exec();
        const contractSummary = contract
            ? await this._summaryFromContractDoc(contract).catch(() => null)
            : null;
        return { ...updated, contractSummary };
    }
    async assignContract(id, businessId, contractId, actor) {
        const doc = await this.findByIdOrThrow(id, businessId);
        const contract = await this.assertContractOwnership(contractId, businessId);
        if (doc.status === 'cancelled') {
            throw new common_1.BadRequestException('Cannot assign a contract to a cancelled shift');
        }
        const updated = await this.model
            .findOneAndUpdate({ _id: id, businessId }, {
            $set: {
                contractId: contractId,
                customerId: contract.customerId ?? null,
                contractAssigned: true,
            },
        }, { new: true })
            .lean()
            .exec();
        if (!updated)
            throw new common_1.NotFoundException('Shift not found');
        const contractSummary = await this._summaryFromContractDoc(contract).catch(() => null);
        return { ...updated, contractSummary };
    }
    async bulkAssignContracts(businessId, assignments, actor) {
        if (!assignments.length) {
            throw new common_1.BadRequestException('assignments must not be empty');
        }
        const shiftIdSet = new Set(assignments.map((a) => a.shiftId));
        if (shiftIdSet.size !== assignments.length) {
            throw new common_1.BadRequestException('assignments contains duplicate shiftId values');
        }
        const validationErrors = [];
        const validPairs = [];
        const skippedOrphanedIds = [];
        for (const { shiftId, contractId } of assignments) {
            if (!mongoose_2.Types.ObjectId.isValid(shiftId)) {
                validationErrors.push({ shiftId, code: 'SHIFT_INVALID_ID', message: 'Invalid Shift ID format' });
                continue;
            }
            if (!mongoose_2.Types.ObjectId.isValid(contractId)) {
                validationErrors.push({ shiftId, code: 'CONTRACT_INVALID_ID', message: 'Invalid Contract ID format' });
                continue;
            }
            const shift = await this.model.findOne({ _id: shiftId, businessId }).lean().exec();
            if (!shift) {
                this.logger.warn(`[bulkAssign] shiftId=${shiftId} not found in MongoDB — treating as orphaned BI record, skipping`);
                skippedOrphanedIds.push(shiftId);
                continue;
            }
            if (shift.status === 'cancelled') {
                validationErrors.push({ shiftId, code: 'SHIFT_CANCELLED', message: 'Cannot assign a Contract to a cancelled Shift' });
                continue;
            }
            const contract = await this.contractModel.findOne({ _id: contractId, businessId }).lean().exec();
            if (!contract) {
                validationErrors.push({ shiftId, code: 'CONTRACT_NOT_FOUND', message: 'Contract not found or belongs to another business' });
                continue;
            }
            if (contract.status !== 'active') {
                validationErrors.push({ shiftId, code: 'CONTRACT_INACTIVE', message: 'The selected Contract is not active' });
                continue;
            }
            validPairs.push({ shiftId, contractId, customerId: contract.customerId ?? null });
        }
        if (validationErrors.length > 0) {
            throw new common_1.BadRequestException({
                success: false,
                message: 'One or more assignments are invalid',
                errors: validationErrors,
            });
        }
        if (validPairs.length === 0) {
            this.logger.warn(`[bulkAssign] businessId=${businessId} all ${skippedOrphanedIds.length} assignments were orphaned BI records — triggering full BI cleanup`);
            this.biService.syncModel(businessId, 'shift', true)
                .then((r) => this.logger.log(`[bulkAssign] full BI cleanup done inserted=${r?.inserted ?? 0} updated=${r?.updated ?? 0}`))
                .catch((err) => this.logger.warn(`[bulkAssign] full BI cleanup failed: ${err?.message ?? 'unknown'}`));
            return { success: true, total: 0, updated: 0, skipped: skippedOrphanedIds.length, shiftIds: [] };
        }
        let session = null;
        try {
            session = await this.model.db.startSession();
            session.startTransaction();
            for (const { shiftId, contractId, customerId } of validPairs) {
                await this.model.findOneAndUpdate({ _id: shiftId, businessId }, { $set: { contractId, customerId, contractAssigned: true } }, { session: session, new: true }).lean().exec();
            }
            await session.commitTransaction();
        }
        catch (err) {
            if (session)
                await session.abortTransaction();
            throw err;
        }
        finally {
            if (session)
                await session.endSession();
        }
        this.biService.syncModel(businessId, 'shift', true)
            .then((r) => this.logger.log(`[bulkAssign] full BI sync done businessId=${businessId} inserted=${r?.inserted ?? 0} updated=${r?.updated ?? 0}`))
            .catch((err) => this.logger.warn(`[bulkAssign] full BI sync failed businessId=${businessId}: ${err?.message ?? 'unknown'}`));
        const updatedIds = validPairs.map((p) => p.shiftId);
        this.logger.log(`[bulkAssign] businessId=${businessId} updated=${updatedIds.length} skipped_orphaned=${skippedOrphanedIds.length} actor=${actor.email}`);
        return {
            success: true,
            total: updatedIds.length + skippedOrphanedIds.length,
            updated: updatedIds.length,
            skipped: skippedOrphanedIds.length,
            shiftIds: updatedIds,
        };
    }
    async remove(id, businessId, actor) {
        const doc = await this.findByIdOrThrow(id, businessId);
        if (doc.status !== 'draft') {
            throw new common_1.BadRequestException('Only draft shifts can be deleted. Cancel confirmed shifts instead.');
        }
        const externalOccurrenceId = doc.externalOccurrenceId;
        const linkedCalendarId = doc.linkedCalendarId;
        if (externalOccurrenceId && linkedCalendarId) {
            const cals = await this.linkedCalendarsService.findAll(businessId, { status: 'active', flow: 'shifts' });
            const cal = cals.find((c) => c.id === linkedCalendarId);
            if (cal) {
                await this.calendarClient.deleteCalendarEvent(businessId, cal.connectionId, cal.externalCalendarId, externalOccurrenceId);
                this.logger.log(`[ShiftsService.remove] Deleted external event ${externalOccurrenceId} from calendar ${linkedCalendarId}`);
            }
            else {
                this.logger.warn(`[ShiftsService.remove] LinkedCalendar ${linkedCalendarId} not active for business ${businessId}; skipping external delete`);
            }
        }
        const contract = await this.contractModel.findById(doc.contractId).lean().exec();
        await this.model.findOneAndDelete({ _id: id, businessId }).exec();
    }
    async _notify(eventKey, shift, contract, actor) {
        void eventKey;
        void shift;
        void contract;
        void actor;
    }
};
exports.ShiftsService = ShiftsService;
exports.ShiftsService = ShiftsService = ShiftsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(shift_schema_1.Shift.name)),
    __param(1, (0, mongoose_1.InjectModel)(contract_schema_1.Contract.name)),
    __param(2, (0, mongoose_1.InjectModel)(customer_schema_1.Customer.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        communications_client_service_1.CommunicationsClientService,
        business_intelligence_service_1.BusinessIntelligenceService,
        users_service_1.UsersService,
        linked_calendars_service_1.LinkedCalendarsService,
        communications_calendar_client_1.CommunicationsCalendarClient])
], ShiftsService);
//# sourceMappingURL=shifts.service.js.map