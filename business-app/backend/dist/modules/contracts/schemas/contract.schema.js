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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractSchema = exports.Contract = exports.RateRuleSchema = exports.RateRule = exports.VALID_RATE_DAYS = exports.SuperannuationRulesSchema = exports.SuperannuationRules = exports.HolidayRulesSchema = exports.HolidayRules = exports.SUPER_PAYMENT_FREQUENCIES = exports.VALID_HOLIDAY_BEHAVIOURS = exports.SUPPORTED_CURRENCIES = exports.SCHEDULED_PAYMENT_DAYS = exports.VALID_WORK_TYPES = void 0;
const mongoose_1 = require("@nestjs/mongoose");
exports.VALID_WORK_TYPES = [
    'casual',
    'contractor',
    'subcontractor',
    'service_agreement',
    'project_based',
    'other',
];
exports.SCHEDULED_PAYMENT_DAYS = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
];
exports.SUPPORTED_CURRENCIES = ['AUD', 'USD', 'NZD', 'GBP', 'EUR', 'COP'];
exports.VALID_HOLIDAY_BEHAVIOURS = [
    'normal_rate',
    'multiplier',
    'fixed_rate',
    'no_work',
];
exports.SUPER_PAYMENT_FREQUENCIES = ['pay_cycle', 'monthly', 'quarterly'];
let HolidayRules = class HolidayRules {
    enabled;
    calendarId;
    calendarName;
    calendarProviderName;
    behaviour;
    multiplier;
    fixedHourlyRate;
};
exports.HolidayRules = HolidayRules;
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], HolidayRules.prototype, "enabled", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], HolidayRules.prototype, "calendarId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true }),
    __metadata("design:type", Object)
], HolidayRules.prototype, "calendarName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true }),
    __metadata("design:type", Object)
], HolidayRules.prototype, "calendarProviderName", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['normal_rate', 'multiplier', 'fixed_rate', 'no_work', null],
        default: 'normal_rate',
    }),
    __metadata("design:type", Object)
], HolidayRules.prototype, "behaviour", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: null }),
    __metadata("design:type", Object)
], HolidayRules.prototype, "multiplier", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: null }),
    __metadata("design:type", Object)
], HolidayRules.prototype, "fixedHourlyRate", void 0);
exports.HolidayRules = HolidayRules = __decorate([
    (0, mongoose_1.Schema)({ _id: false, versionKey: false })
], HolidayRules);
exports.HolidayRulesSchema = mongoose_1.SchemaFactory.createForClass(HolidayRules);
let SuperannuationRules = class SuperannuationRules {
    enabled;
    rate;
    paymentFrequency;
};
exports.SuperannuationRules = SuperannuationRules;
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], SuperannuationRules.prototype, "enabled", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: null }),
    __metadata("design:type", Object)
], SuperannuationRules.prototype, "rate", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['pay_cycle', 'monthly', 'quarterly', null],
        default: null,
    }),
    __metadata("design:type", Object)
], SuperannuationRules.prototype, "paymentFrequency", void 0);
exports.SuperannuationRules = SuperannuationRules = __decorate([
    (0, mongoose_1.Schema)({ _id: false, versionKey: false })
], SuperannuationRules);
exports.SuperannuationRulesSchema = mongoose_1.SchemaFactory.createForClass(SuperannuationRules);
exports.VALID_RATE_DAYS = [
    'all',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
];
let RateRule = class RateRule {
    days;
    startTime;
    endTime;
    hourlyRate;
};
exports.RateRule = RateRule;
__decorate([
    (0, mongoose_1.Prop)({ type: [String], required: true }),
    __metadata("design:type", Array)
], RateRule.prototype, "days", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], RateRule.prototype, "startTime", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], RateRule.prototype, "endTime", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], RateRule.prototype, "hourlyRate", void 0);
exports.RateRule = RateRule = __decorate([
    (0, mongoose_1.Schema)({ _id: false, versionKey: false })
], RateRule);
exports.RateRuleSchema = mongoose_1.SchemaFactory.createForClass(RateRule);
let Contract = class Contract {
    businessId;
    customerId;
    startDate;
    endDate;
    positionName;
    workType;
    invoiceDescription;
    status;
    billingCycle;
    invoiceDueRule;
    paymentTermsDays;
    scheduledPaymentEnabled;
    scheduledPaymentDay;
    rateType;
    minimumHours;
    defaultBreakMinutes;
    rates;
    notes;
    useInvoicePrefix;
    invoicePrefix;
    startingInvoiceNumber;
    currency;
    chargeGst;
    gstRate;
    holidayRules;
    superannuationRules;
    paymentCalendarEnabled;
    paymentCalendarSubscriptionId;
};
exports.Contract = Contract;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Contract.prototype, "businessId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Contract.prototype, "customerId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], Contract.prototype, "startDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], Contract.prototype, "endDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], Contract.prototype, "positionName", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['casual', 'contractor', 'subcontractor', 'service_agreement', 'project_based', 'other'],
        default: 'contractor',
    }),
    __metadata("design:type", String)
], Contract.prototype, "workType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], Contract.prototype, "invoiceDescription", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        enum: ['draft', 'active', 'inactive', 'finished', 'cancelled'],
        default: 'active',
    }),
    __metadata("design:type", String)
], Contract.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        enum: ['per_shift', 'daily', 'weekly', 'fortnightly', 'monthly'],
    }),
    __metadata("design:type", String)
], Contract.prototype, "billingCycle", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['from_invoice_date', 'end_of_week', 'end_of_month'],
        default: 'from_invoice_date',
    }),
    __metadata("design:type", String)
], Contract.prototype, "invoiceDueRule", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: null }),
    __metadata("design:type", Object)
], Contract.prototype, "paymentTermsDays", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], Contract.prototype, "scheduledPaymentEnabled", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', null],
        default: null,
    }),
    __metadata("design:type", Object)
], Contract.prototype, "scheduledPaymentDay", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        enum: ['fixed', 'variable', 'variable_time_range'],
    }),
    __metadata("design:type", String)
], Contract.prototype, "rateType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 4 }),
    __metadata("design:type", Number)
], Contract.prototype, "minimumHours", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 30 }),
    __metadata("design:type", Number)
], Contract.prototype, "defaultBreakMinutes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.RateRuleSchema], required: true, default: [] }),
    __metadata("design:type", Array)
], Contract.prototype, "rates", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true }),
    __metadata("design:type", Object)
], Contract.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], Contract.prototype, "useInvoicePrefix", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true }),
    __metadata("design:type", Object)
], Contract.prototype, "invoicePrefix", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 1, min: 1 }),
    __metadata("design:type", Number)
], Contract.prototype, "startingInvoiceNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['AUD', 'USD', 'NZD', 'GBP', 'EUR', 'COP'],
        default: 'AUD',
    }),
    __metadata("design:type", String)
], Contract.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], Contract.prototype, "chargeGst", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: null }),
    __metadata("design:type", Object)
], Contract.prototype, "gstRate", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: exports.HolidayRulesSchema,
        default: () => ({
            enabled: false,
            calendarId: null,
            calendarName: null,
            calendarProviderName: null,
            behaviour: 'normal_rate',
            multiplier: null,
            fixedHourlyRate: null,
        }),
    }),
    __metadata("design:type", HolidayRules)
], Contract.prototype, "holidayRules", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: exports.SuperannuationRulesSchema,
        default: () => ({
            enabled: false,
            rate: null,
            paymentFrequency: null,
        }),
    }),
    __metadata("design:type", SuperannuationRules)
], Contract.prototype, "superannuationRules", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], Contract.prototype, "paymentCalendarEnabled", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Contract.prototype, "paymentCalendarSubscriptionId", void 0);
exports.Contract = Contract = __decorate([
    (0, mongoose_1.Schema)({
        collection: 'contracts',
        timestamps: true,
        versionKey: false,
    })
], Contract);
exports.ContractSchema = mongoose_1.SchemaFactory.createForClass(Contract);
exports.ContractSchema.index({ businessId: 1, customerId: 1 });
exports.ContractSchema.index({ businessId: 1, status: 1 });
exports.ContractSchema.index({ customerId: 1, status: 1 });
//# sourceMappingURL=contract.schema.js.map