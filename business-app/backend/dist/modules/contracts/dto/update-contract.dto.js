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
exports.UpdateContractDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const create_contract_dto_1 = require("./create-contract.dto");
const contract_schema_1 = require("../schemas/contract.schema");
class UpdateContractDto {
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
exports.UpdateContractDto = UpdateContractDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateContractDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], UpdateContractDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], UpdateContractDto.prototype, "positionName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['casual', 'contractor', 'subcontractor', 'service_agreement', 'project_based', 'other']),
    __metadata("design:type", String)
], UpdateContractDto.prototype, "workType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], UpdateContractDto.prototype, "invoiceDescription", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['per_shift', 'daily', 'weekly', 'fortnightly', 'monthly']),
    __metadata("design:type", String)
], UpdateContractDto.prototype, "billingCycle", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(365),
    __metadata("design:type", Object)
], UpdateContractDto.prototype, "paymentTermsDays", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateContractDto.prototype, "scheduledPaymentEnabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(contract_schema_1.SCHEDULED_PAYMENT_DAYS, {
        message: `scheduledPaymentDay must be one of: ${contract_schema_1.SCHEDULED_PAYMENT_DAYS.join(', ')}`,
    }),
    __metadata("design:type", Object)
], UpdateContractDto.prototype, "scheduledPaymentDay", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['fixed', 'variable', 'variable_time_range']),
    __metadata("design:type", String)
], UpdateContractDto.prototype, "rateType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateContractDto.prototype, "minimumHours", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(480),
    __metadata("design:type", Number)
], UpdateContractDto.prototype, "defaultBreakMinutes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => create_contract_dto_1.RateRuleDto),
    __metadata("design:type", Array)
], UpdateContractDto.prototype, "rates", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], UpdateContractDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateContractDto.prototype, "useInvoicePrefix", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", Object)
], UpdateContractDto.prototype, "invoicePrefix", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UpdateContractDto.prototype, "startingInvoiceNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(contract_schema_1.SUPPORTED_CURRENCIES, {
        message: `currency must be one of: ${contract_schema_1.SUPPORTED_CURRENCIES.join(', ')}`,
    }),
    __metadata("design:type", String)
], UpdateContractDto.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateContractDto.prototype, "chargeGst", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => o.chargeGst === true),
    (0, class_validator_1.IsNumber)({}, { message: 'gstRate must be a number' }),
    (0, class_validator_1.Min)(0.01, { message: 'gstRate must be greater than 0' }),
    (0, class_validator_1.Max)(100, { message: 'gstRate must not exceed 100' }),
    __metadata("design:type", Object)
], UpdateContractDto.prototype, "gstRate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => create_contract_dto_1.HolidayRulesDto),
    __metadata("design:type", create_contract_dto_1.HolidayRulesDto)
], UpdateContractDto.prototype, "holidayRules", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => create_contract_dto_1.SuperannuationRulesDto),
    __metadata("design:type", create_contract_dto_1.SuperannuationRulesDto)
], UpdateContractDto.prototype, "superannuationRules", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateContractDto.prototype, "paymentCalendarEnabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateContractDto.prototype, "paymentCalendarSubscriptionId", void 0);
//# sourceMappingURL=update-contract.dto.js.map