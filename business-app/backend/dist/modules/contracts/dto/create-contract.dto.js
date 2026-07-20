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
exports.CreateContractDto = exports.RateRuleDto = exports.SuperannuationRulesDto = exports.HolidayRulesDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const contract_schema_1 = require("../schemas/contract.schema");
class HolidayRulesDto {
    enabled;
    calendarId;
    calendarName;
    calendarProviderName;
    behaviour;
    multiplier;
    fixedHourlyRate;
}
exports.HolidayRulesDto = HolidayRulesDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], HolidayRulesDto.prototype, "enabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], HolidayRulesDto.prototype, "calendarId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", Object)
], HolidayRulesDto.prototype, "calendarName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", Object)
], HolidayRulesDto.prototype, "calendarProviderName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['normal_rate', 'multiplier', 'fixed_rate', 'no_work', null]),
    __metadata("design:type", Object)
], HolidayRulesDto.prototype, "behaviour", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => o.behaviour === 'multiplier'),
    (0, class_validator_1.IsNumber)({}, { message: 'multiplier must be a number' }),
    (0, class_validator_1.Min)(0.01, { message: 'multiplier must be greater than 0' }),
    __metadata("design:type", Object)
], HolidayRulesDto.prototype, "multiplier", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => o.behaviour === 'fixed_rate'),
    (0, class_validator_1.IsNumber)({}, { message: 'fixedHourlyRate must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'fixedHourlyRate must be >= 0' }),
    __metadata("design:type", Object)
], HolidayRulesDto.prototype, "fixedHourlyRate", void 0);
class SuperannuationRulesDto {
    enabled;
    rate;
    paymentFrequency;
}
exports.SuperannuationRulesDto = SuperannuationRulesDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SuperannuationRulesDto.prototype, "enabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({}, { message: 'rate must be a number' }),
    (0, class_validator_1.Min)(0.01, { message: 'rate must be greater than 0' }),
    (0, class_validator_1.Max)(100, { message: 'rate must not exceed 100' }),
    __metadata("design:type", Object)
], SuperannuationRulesDto.prototype, "rate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(contract_schema_1.SUPER_PAYMENT_FREQUENCIES, {
        message: `paymentFrequency must be one of: ${contract_schema_1.SUPER_PAYMENT_FREQUENCIES.join(', ')}`,
    }),
    __metadata("design:type", Object)
], SuperannuationRulesDto.prototype, "paymentFrequency", void 0);
class RateRuleDto {
    days;
    startTime;
    endTime;
    hourlyRate;
}
exports.RateRuleDto = RateRuleDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.ArrayMinSize)(1),
    __metadata("design:type", Array)
], RateRuleDto.prototype, "days", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{2}:\d{2}$/, { message: 'startTime must be HH:mm' }),
    __metadata("design:type", Object)
], RateRuleDto.prototype, "startTime", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{2}:\d{2}$/, { message: 'endTime must be HH:mm' }),
    __metadata("design:type", Object)
], RateRuleDto.prototype, "endTime", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'hourlyRate must be a number' }),
    (0, class_validator_1.Min)(0.01, { message: 'hourlyRate must be greater than 0' }),
    __metadata("design:type", Number)
], RateRuleDto.prototype, "hourlyRate", void 0);
class CreateContractDto {
    customerId;
    startDate;
    endDate;
    positionName;
    workType;
    invoiceDescription;
    billingCycle;
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
}
exports.CreateContractDto = CreateContractDto;
__decorate([
    (0, class_validator_1.IsMongoId)({ message: 'customerId must be a valid ObjectId' }),
    __metadata("design:type", String)
], CreateContractDto.prototype, "customerId", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'startDate must be a valid ISO date string' }),
    __metadata("design:type", String)
], CreateContractDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)({}, { message: 'endDate must be a valid ISO date string' }),
    __metadata("design:type", String)
], CreateContractDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CreateContractDto.prototype, "positionName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['casual', 'contractor', 'subcontractor', 'service_agreement', 'project_based', 'other']),
    __metadata("design:type", String)
], CreateContractDto.prototype, "workType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateContractDto.prototype, "invoiceDescription", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['per_shift', 'daily', 'weekly', 'fortnightly', 'monthly'], {
        message: 'billingCycle must be one of: per_shift, daily, weekly, fortnightly, monthly',
    }),
    __metadata("design:type", String)
], CreateContractDto.prototype, "billingCycle", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => !o.scheduledPaymentEnabled),
    (0, class_validator_1.IsInt)({ message: 'paymentTermsDays must be an integer' }),
    (0, class_validator_1.Min)(0, { message: 'paymentTermsDays must be >= 0' }),
    (0, class_validator_1.Max)(365),
    __metadata("design:type", Object)
], CreateContractDto.prototype, "paymentTermsDays", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateContractDto.prototype, "scheduledPaymentEnabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => o.scheduledPaymentEnabled === true),
    (0, class_validator_1.IsEnum)(contract_schema_1.SCHEDULED_PAYMENT_DAYS, {
        message: `scheduledPaymentDay must be one of: ${contract_schema_1.SCHEDULED_PAYMENT_DAYS.join(', ')}`,
    }),
    __metadata("design:type", Object)
], CreateContractDto.prototype, "scheduledPaymentDay", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['fixed', 'variable', 'variable_time_range'], {
        message: 'rateType must be one of: fixed, variable, variable_time_range',
    }),
    __metadata("design:type", String)
], CreateContractDto.prototype, "rateType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateContractDto.prototype, "minimumHours", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(480),
    __metadata("design:type", Number)
], CreateContractDto.prototype, "defaultBreakMinutes", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1, { message: 'rates must have at least one rule' }),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => RateRuleDto),
    __metadata("design:type", Array)
], CreateContractDto.prototype, "rates", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], CreateContractDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateContractDto.prototype, "useInvoicePrefix", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", Object)
], CreateContractDto.prototype, "invoicePrefix", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateContractDto.prototype, "startingInvoiceNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(contract_schema_1.SUPPORTED_CURRENCIES, {
        message: `currency must be one of: ${contract_schema_1.SUPPORTED_CURRENCIES.join(', ')}`,
    }),
    __metadata("design:type", String)
], CreateContractDto.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateContractDto.prototype, "chargeGst", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => o.chargeGst === true),
    (0, class_validator_1.IsNumber)({}, { message: 'gstRate must be a number' }),
    (0, class_validator_1.Min)(0.01, { message: 'gstRate must be greater than 0' }),
    (0, class_validator_1.Max)(100, { message: 'gstRate must not exceed 100' }),
    __metadata("design:type", Object)
], CreateContractDto.prototype, "gstRate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => HolidayRulesDto),
    __metadata("design:type", HolidayRulesDto)
], CreateContractDto.prototype, "holidayRules", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => SuperannuationRulesDto),
    __metadata("design:type", SuperannuationRulesDto)
], CreateContractDto.prototype, "superannuationRules", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateContractDto.prototype, "paymentCalendarEnabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], CreateContractDto.prototype, "paymentCalendarSubscriptionId", void 0);
//# sourceMappingURL=create-contract.dto.js.map