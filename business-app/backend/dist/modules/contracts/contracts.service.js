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
var ContractsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const contract_schema_1 = require("./schemas/contract.schema");
const customer_schema_1 = require("../customer/schemas/customer.schema");
const shift_schema_1 = require("../shifts/schemas/shift.schema");
const linked_calendar_schema_1 = require("../linked-calendars/schemas/linked-calendar.schema");
const communications_client_service_1 = require("../../integrations/communications/client/communications-client.service");
const users_service_1 = require("../users/users.service");
let ContractsService = ContractsService_1 = class ContractsService {
    model;
    customerModel;
    calendarModel;
    shiftModel;
    commClient;
    usersService;
    logger = new common_1.Logger(ContractsService_1.name);
    constructor(model, customerModel, calendarModel, shiftModel, commClient, usersService) {
        this.model = model;
        this.customerModel = customerModel;
        this.calendarModel = calendarModel;
        this.shiftModel = shiftModel;
        this.commClient = commClient;
        this.usersService = usersService;
    }
    async assertCustomerOwnership(customerId, businessId) {
        if (!mongoose_2.Types.ObjectId.isValid(customerId)) {
            throw new common_1.BadRequestException('Invalid customerId');
        }
        const customer = await this.customerModel
            .findOne({ _id: customerId, companyId: businessId })
            .lean()
            .exec();
        if (!customer) {
            throw new common_1.NotFoundException('Customer not found or does not belong to this business');
        }
        return customer;
    }
    async assertCalendarFlow(calendarId, businessId, expectedFlow, requireActive = true) {
        if (!mongoose_2.Types.ObjectId.isValid(calendarId)) {
            throw new common_1.BadRequestException(`Invalid ${expectedFlow} calendar ID`);
        }
        const cal = await this.calendarModel
            .findOne({ _id: calendarId, companyId: businessId })
            .select('flow status')
            .lean()
            .exec();
        if (!cal) {
            throw new common_1.NotFoundException(`${expectedFlow} calendar not found or does not belong to this business`);
        }
        if (cal.flow !== expectedFlow) {
            throw new common_1.BadRequestException(`Calendar is assigned to flow "${cal.flow ?? 'unassigned'}" — expected "${expectedFlow}"`);
        }
        if (requireActive && cal.status !== 'active') {
            throw new common_1.BadRequestException(`The selected ${expectedFlow} calendar is inactive. Activate it or choose a different one.`);
        }
    }
    validateRates(rateType, rates) {
        if (!rates || rates.length === 0) {
            throw new common_1.BadRequestException('rates must have at least one rule');
        }
        for (const rule of rates) {
            if (!rule.days || rule.days.length === 0) {
                throw new common_1.BadRequestException('Each rate rule must specify at least one day');
            }
            const invalidDays = rule.days.filter((d) => !contract_schema_1.VALID_RATE_DAYS.includes(d));
            if (invalidDays.length > 0) {
                throw new common_1.BadRequestException(`Invalid day values: ${invalidDays.join(', ')}. Valid: ${contract_schema_1.VALID_RATE_DAYS.join(', ')}`);
            }
        }
        if (rateType === 'fixed') {
            if (rates.length !== 1) {
                throw new common_1.BadRequestException('Fixed rateType must have exactly one rate rule');
            }
            const rule = rates[0];
            if (rule.days.length !== 1 || rule.days[0] !== 'all') {
                throw new common_1.BadRequestException('Fixed rate rule must have days: ["all"]');
            }
            if (rule.startTime || rule.endTime) {
                throw new common_1.BadRequestException('Fixed rate rule must have startTime and endTime as null');
            }
        }
        if (rateType === 'variable') {
            for (const rule of rates) {
                if (rule.startTime || rule.endTime) {
                    throw new common_1.BadRequestException('variable rateType rules must not have startTime or endTime');
                }
            }
        }
        if (rateType === 'variable_time_range') {
            const timePattern = /^\d{2}:\d{2}$/;
            for (const rule of rates) {
                if (!rule.startTime || !rule.endTime) {
                    throw new common_1.BadRequestException('variable_time_range rules require startTime and endTime');
                }
                if (!timePattern.test(rule.startTime) || !timePattern.test(rule.endTime)) {
                    throw new common_1.BadRequestException('startTime and endTime must be in HH:mm format');
                }
            }
        }
    }
    validateDateRange(startDate, endDate) {
        if (!endDate)
            return;
        if (new Date(endDate) < new Date(startDate)) {
            throw new common_1.BadRequestException('endDate cannot be earlier than startDate');
        }
    }
    async create(businessId, dto, actor) {
        await this.assertCustomerOwnership(dto.customerId, businessId);
        this.validateDateRange(dto.startDate, dto.endDate);
        this.validateRates(dto.rateType, dto.rates);
        if (dto.holidayRules?.enabled && dto.holidayRules.calendarId) {
            await this.assertCalendarFlow(dto.holidayRules.calendarId, businessId, 'holidays', true);
        }
        if (dto.paymentCalendarEnabled) {
            if (!dto.paymentCalendarSubscriptionId) {
                throw new common_1.BadRequestException('paymentCalendarSubscriptionId is required when paymentCalendarEnabled is true');
            }
            await this.assertCalendarFlow(dto.paymentCalendarSubscriptionId, businessId, 'payments', true);
        }
        const doc = await this.model.create({
            businessId,
            customerId: dto.customerId,
            startDate: new Date(dto.startDate),
            endDate: dto.endDate ? new Date(dto.endDate) : null,
            positionName: dto.positionName.trim(),
            workType: dto.workType ?? 'contractor',
            invoiceDescription: dto.invoiceDescription.trim(),
            status: 'active',
            billingCycle: dto.billingCycle,
            invoiceDueRule: dto.invoiceDueRule ?? 'from_invoice_date',
            paymentTermsDays: (dto.scheduledPaymentEnabled ?? false) ? null : (dto.paymentTermsDays ?? null),
            scheduledPaymentEnabled: dto.scheduledPaymentEnabled ?? false,
            scheduledPaymentDay: ((dto.scheduledPaymentEnabled ?? false) ? (dto.scheduledPaymentDay ?? null) : null),
            rateType: dto.rateType,
            minimumHours: dto.minimumHours ?? 4,
            defaultBreakMinutes: dto.defaultBreakMinutes ?? 30,
            rates: dto.rates,
            notes: dto.notes?.trim() ?? null,
            useInvoicePrefix: dto.useInvoicePrefix ?? false,
            invoicePrefix: (dto.useInvoicePrefix && dto.invoicePrefix) ? dto.invoicePrefix.trim() : null,
            startingInvoiceNumber: dto.startingInvoiceNumber ?? 1,
            currency: (dto.currency ?? 'AUD'),
            chargeGst: dto.chargeGst ?? false,
            gstRate: (dto.chargeGst ?? false) ? (dto.gstRate ?? null) : null,
            holidayRules: dto.holidayRules
                ? {
                    enabled: dto.holidayRules.enabled ?? false,
                    calendarId: dto.holidayRules.calendarId ?? null,
                    calendarName: dto.holidayRules.calendarName ?? null,
                    calendarProviderName: dto.holidayRules.calendarProviderName ?? null,
                    behaviour: dto.holidayRules.behaviour ?? 'normal_rate',
                    multiplier: dto.holidayRules.multiplier ?? null,
                    fixedHourlyRate: dto.holidayRules.fixedHourlyRate ?? null,
                }
                : undefined,
            superannuationRules: dto.superannuationRules
                ? {
                    enabled: dto.superannuationRules.enabled ?? false,
                    rate: dto.superannuationRules.enabled ? (dto.superannuationRules.rate ?? null) : null,
                    paymentFrequency: dto.superannuationRules.enabled ? (dto.superannuationRules.paymentFrequency ?? null) : null,
                }
                : undefined,
            paymentCalendarEnabled: dto.paymentCalendarEnabled ?? false,
            paymentCalendarSubscriptionId: (dto.paymentCalendarEnabled ?? false)
                ? (dto.paymentCalendarSubscriptionId ?? null)
                : null,
        });
        this._notify('contracts.contract_created', doc, actor).catch(() => void 0);
        return doc;
    }
    async findAll(businessId, params) {
        const { page, limit, customerId, status, search } = params;
        const skip = (page - 1) * limit;
        const filter = { businessId };
        if (customerId)
            filter.customerId = customerId;
        if (status)
            filter.status = status;
        if (search?.trim()) {
            const re = new RegExp(search.trim(), 'i');
            filter.$or = [{ positionName: re }, { invoiceDescription: re }];
        }
        const [items, total] = await Promise.all([
            this.model
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.model.countDocuments(filter),
        ]);
        const customerIds = [...new Set(items.map((c) => String(c.customerId)).filter(Boolean))];
        const customers = customerIds.length > 0
            ? await this.customerModel
                .find({ _id: { $in: customerIds } })
                .select('_id displayName')
                .lean()
                .exec()
            : [];
        const customerNameMap = new Map(customers.map((c) => [String(c._id), c.displayName ?? null]));
        const itemsWithCustomer = items.map((item) => ({
            ...item,
            customerName: customerNameMap.get(String(item.customerId)) ?? null,
        }));
        return { items: itemsWithCustomer, total, page, limit };
    }
    async findById(id, businessId) {
        if (!mongoose_2.Types.ObjectId.isValid(id))
            return null;
        return this.model.findOne({ _id: id, businessId }).lean().exec();
    }
    async findByIdOrThrow(id, businessId) {
        const doc = await this.findById(id, businessId);
        if (!doc)
            throw new common_1.NotFoundException('Contract not found');
        return doc;
    }
    async findByCustomer(customerId, businessId) {
        return this.model
            .find({ customerId, businessId })
            .sort({ createdAt: -1 })
            .lean()
            .exec();
    }
    async update(id, businessId, dto, actor) {
        const existing = await this.findByIdOrThrow(id, businessId);
        if (existing.status === 'finished' || existing.status === 'cancelled') {
            throw new common_1.BadRequestException(`Cannot update a contract with status "${existing.status}"`);
        }
        if (dto.endDate || dto.startDate) {
            const startDate = dto.startDate ?? existing.startDate?.toISOString();
            this.validateDateRange(startDate, dto.endDate);
        }
        const rateType = dto.rateType ?? existing.rateType;
        if (dto.rates) {
            this.validateRates(rateType, dto.rates);
        }
        else if (dto.rateType && dto.rateType !== existing.rateType) {
            this.validateRates(dto.rateType, existing.rates);
        }
        if (dto.holidayRules?.enabled && dto.holidayRules.calendarId) {
            const existingCalId = existing.holidayRules?.calendarId ?? null;
            const isNewAssignment = dto.holidayRules.calendarId !== existingCalId;
            await this.assertCalendarFlow(dto.holidayRules.calendarId, businessId, 'holidays', isNewAssignment);
        }
        if (dto.paymentCalendarEnabled) {
            if (!dto.paymentCalendarSubscriptionId) {
                throw new common_1.BadRequestException('paymentCalendarSubscriptionId is required when paymentCalendarEnabled is true');
            }
            const existingPayCalId = existing.paymentCalendarSubscriptionId ?? null;
            const isNewAssignment = dto.paymentCalendarSubscriptionId !== existingPayCalId;
            await this.assertCalendarFlow(dto.paymentCalendarSubscriptionId, businessId, 'payments', isNewAssignment);
        }
        const $set = {};
        if (dto.startDate !== undefined)
            $set.startDate = new Date(dto.startDate);
        if (dto.endDate !== undefined)
            $set.endDate = dto.endDate ? new Date(dto.endDate) : null;
        if (dto.positionName !== undefined)
            $set.positionName = dto.positionName.trim();
        if (dto.workType !== undefined)
            $set.workType = dto.workType;
        if (dto.invoiceDescription !== undefined)
            $set.invoiceDescription = dto.invoiceDescription.trim();
        if (dto.billingCycle !== undefined)
            $set.billingCycle = dto.billingCycle;
        if (dto.invoiceDueRule !== undefined)
            $set.invoiceDueRule = dto.invoiceDueRule;
        if (dto.scheduledPaymentEnabled !== undefined) {
            $set.scheduledPaymentEnabled = dto.scheduledPaymentEnabled;
            $set.paymentTermsDays = dto.scheduledPaymentEnabled ? null : (dto.paymentTermsDays ?? null);
            $set.scheduledPaymentDay = dto.scheduledPaymentEnabled ? (dto.scheduledPaymentDay ?? null) : null;
        }
        else {
            if (dto.paymentTermsDays !== undefined)
                $set.paymentTermsDays = dto.paymentTermsDays;
            if (dto.scheduledPaymentDay !== undefined)
                $set.scheduledPaymentDay = dto.scheduledPaymentDay;
        }
        if (dto.rateType !== undefined)
            $set.rateType = dto.rateType;
        if (dto.minimumHours !== undefined)
            $set.minimumHours = dto.minimumHours;
        if (dto.defaultBreakMinutes !== undefined)
            $set.defaultBreakMinutes = dto.defaultBreakMinutes;
        if (dto.rates !== undefined)
            $set.rates = dto.rates;
        if (dto.notes !== undefined)
            $set.notes = dto.notes?.trim() ?? null;
        if (dto.useInvoicePrefix !== undefined)
            $set.useInvoicePrefix = dto.useInvoicePrefix;
        if (dto.invoicePrefix !== undefined)
            $set.invoicePrefix = dto.invoicePrefix?.trim() ?? null;
        if (dto.startingInvoiceNumber !== undefined)
            $set.startingInvoiceNumber = dto.startingInvoiceNumber;
        if (dto.currency !== undefined)
            $set.currency = dto.currency;
        if (dto.chargeGst !== undefined)
            $set.chargeGst = dto.chargeGst;
        if (dto.gstRate !== undefined)
            $set.gstRate = dto.chargeGst ? (dto.gstRate ?? null) : null;
        if (dto.holidayRules !== undefined) {
            $set.holidayRules = {
                enabled: dto.holidayRules.enabled ?? false,
                calendarId: dto.holidayRules.calendarId ?? null,
                calendarName: dto.holidayRules.calendarName ?? null,
                calendarProviderName: dto.holidayRules.calendarProviderName ?? null,
                behaviour: dto.holidayRules.behaviour ?? 'normal_rate',
                multiplier: dto.holidayRules.multiplier ?? null,
                fixedHourlyRate: dto.holidayRules.fixedHourlyRate ?? null,
            };
        }
        if (dto.superannuationRules !== undefined) {
            $set.superannuationRules = {
                enabled: dto.superannuationRules.enabled ?? false,
                rate: dto.superannuationRules.enabled ? (dto.superannuationRules.rate ?? null) : null,
                paymentFrequency: dto.superannuationRules.enabled ? (dto.superannuationRules.paymentFrequency ?? null) : null,
            };
        }
        if (dto.paymentCalendarEnabled !== undefined) {
            $set.paymentCalendarEnabled = dto.paymentCalendarEnabled;
            $set.paymentCalendarSubscriptionId = dto.paymentCalendarEnabled
                ? (dto.paymentCalendarSubscriptionId ?? null)
                : null;
        }
        else if (dto.paymentCalendarSubscriptionId !== undefined) {
            $set.paymentCalendarSubscriptionId = dto.paymentCalendarSubscriptionId;
        }
        const updated = await this.model
            .findOneAndUpdate({ _id: id, businessId }, { $set }, { new: true })
            .lean()
            .exec();
        if (!updated)
            throw new common_1.NotFoundException('Contract not found');
        this._notify('contracts.contract_updated', updated, actor).catch(() => void 0);
        return updated;
    }
    async activate(id, businessId, actor) {
        const doc = await this.findByIdOrThrow(id, businessId);
        const current = doc.status;
        if (current !== 'draft' && current !== 'inactive') {
            throw new common_1.BadRequestException(`Cannot activate a contract with status "${current}". Only draft or inactive contracts can be activated.`);
        }
        const updated = await this.model
            .findOneAndUpdate({ _id: id, businessId }, { $set: { status: 'active' } }, { new: true })
            .lean()
            .exec();
        if (!updated)
            throw new common_1.NotFoundException('Contract not found');
        this._notify('contracts.contract_activated', updated, actor).catch(() => void 0);
        return updated;
    }
    async cancel(id, businessId, actor) {
        const doc = await this.findByIdOrThrow(id, businessId);
        const current = doc.status;
        if (current === 'finished' || current === 'cancelled') {
            throw new common_1.BadRequestException(`Cannot cancel a contract with status "${current}"`);
        }
        const updated = await this.model
            .findOneAndUpdate({ _id: id, businessId }, { $set: { status: 'cancelled' } }, { new: true })
            .lean()
            .exec();
        if (!updated)
            throw new common_1.NotFoundException('Contract not found');
        this._notify('contracts.contract_cancelled', updated, actor).catch(() => void 0);
        return updated;
    }
    async finish(id, businessId, actor) {
        const doc = await this.findByIdOrThrow(id, businessId);
        const current = doc.status;
        if (current !== 'active') {
            throw new common_1.BadRequestException(`Cannot finish a contract with status "${current}". Only active contracts can be finished.`);
        }
        const updated = await this.model
            .findOneAndUpdate({ _id: id, businessId }, { $set: { status: 'finished' } }, { new: true })
            .lean()
            .exec();
        if (!updated)
            throw new common_1.NotFoundException('Contract not found');
        this._notify('contracts.contract_finished', updated, actor).catch(() => void 0);
        return updated;
    }
    async remove(id, businessId) {
        await this.findByIdOrThrow(id, businessId);
        const hasShifts = await this.shiftModel
            .exists({ contractId: id, businessId })
            .exec();
        if (hasShifts) {
            throw new common_1.BadRequestException('This Contract cannot be deleted because it is already being used.');
        }
        await this.model.findOneAndDelete({ _id: id, businessId }).exec();
    }
    async _notify(eventKey, contract, actor) {
        if (!actor.email) {
            this.logger.warn(`[Contract notification] ${eventKey} SKIPPED — actor has no email address (contractId=${contract._id})`);
            return;
        }
        try {
            const businessName = await this.usersService
                .getCompanyDisplayName(actor.companyId)
                .catch(() => '');
            const customer = await this.customerModel
                .findById(contract.customerId)
                .select('displayName')
                .lean()
                .exec();
            const delivered = await this.commClient.notifyEvent({
                type: 'platform',
                event: eventKey,
                email: actor.email,
                data: {
                    firstName: actor.firstName,
                    businessName,
                    customerName: customer?.displayName ?? '',
                    positionName: contract.positionName,
                    contractStatus: contract.status,
                    actionDate: new Date().toISOString(),
                    startDate: contract.startDate
                        ? new Date(contract.startDate).toISOString()
                        : null,
                    endDate: contract.endDate
                        ? new Date(contract.endDate).toISOString()
                        : null,
                },
            });
            this.logger.log(`[Contract notification] ${eventKey} → ${actor.email} delivered=${delivered}`);
        }
        catch (err) {
            this.logger.error(`[Contract notification] ${eventKey} failed: ${err?.message}`);
        }
    }
};
exports.ContractsService = ContractsService;
exports.ContractsService = ContractsService = ContractsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(contract_schema_1.Contract.name)),
    __param(1, (0, mongoose_1.InjectModel)(customer_schema_1.Customer.name)),
    __param(2, (0, mongoose_1.InjectModel)(linked_calendar_schema_1.LinkedCalendar.name)),
    __param(3, (0, mongoose_1.InjectModel)(shift_schema_1.Shift.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        communications_client_service_1.CommunicationsClientService,
        users_service_1.UsersService])
], ContractsService);
//# sourceMappingURL=contracts.service.js.map