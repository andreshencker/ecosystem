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
exports.PlatformAdminContractSummaryQueryDto = exports.PlatformAdminContractQueryDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
function toBoolean(value) {
    if (value === undefined || value === null)
        return undefined;
    if (typeof value === 'boolean')
        return value;
    if (value === 'true')
        return true;
    if (value === 'false')
        return false;
    return undefined;
}
function toInt(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.floor(n) : undefined;
}
class PlatformAdminContractQueryDto {
    search;
    businessId;
    customerId;
    status;
    workType;
    billingCycle;
    currency;
    configurationStatus;
    chargeGst;
    superEnabled;
    holidayRulesEnabled;
    paymentCalendarEnabled;
    updatedFrom;
    updatedTo;
    page;
    limit;
    sortBy;
    sortDir;
}
exports.PlatformAdminContractQueryDto = PlatformAdminContractQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Search across position, description, business name, customer name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlatformAdminContractQueryDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by tenant businessId' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlatformAdminContractQueryDto.prototype, "businessId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by customerId' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlatformAdminContractQueryDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Contract status: active | inactive | finished | cancelled' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlatformAdminContractQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Work type enum' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlatformAdminContractQueryDto.prototype, "workType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Billing cycle enum' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlatformAdminContractQueryDto.prototype, "billingCycle", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Currency code e.g. AUD' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlatformAdminContractQueryDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Configuration health: complete | warning | invalid' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlatformAdminContractQueryDto.prototype, "configurationStatus", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => toBoolean(value)),
    __metadata("design:type", Boolean)
], PlatformAdminContractQueryDto.prototype, "chargeGst", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => toBoolean(value)),
    __metadata("design:type", Boolean)
], PlatformAdminContractQueryDto.prototype, "superEnabled", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => toBoolean(value)),
    __metadata("design:type", Boolean)
], PlatformAdminContractQueryDto.prototype, "holidayRulesEnabled", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => toBoolean(value)),
    __metadata("design:type", Boolean)
], PlatformAdminContractQueryDto.prototype, "paymentCalendarEnabled", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Updated date range start (ISO date)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlatformAdminContractQueryDto.prototype, "updatedFrom", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Updated date range end (ISO date)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlatformAdminContractQueryDto.prototype, "updatedTo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 1, minimum: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_transformer_1.Transform)(({ value }) => toInt(value)),
    __metadata("design:type", Number)
], PlatformAdminContractQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 50, minimum: 1, maximum: 200 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(200),
    (0, class_transformer_1.Transform)(({ value }) => toInt(value)),
    __metadata("design:type", Number)
], PlatformAdminContractQueryDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Sort field: source_created_at | source_updated_at | position_name | status | start_date | configuration_status' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlatformAdminContractQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['asc', 'desc'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlatformAdminContractQueryDto.prototype, "sortDir", void 0);
class PlatformAdminContractSummaryQueryDto {
    businessId;
    status;
    createdFrom;
    createdTo;
}
exports.PlatformAdminContractSummaryQueryDto = PlatformAdminContractSummaryQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlatformAdminContractSummaryQueryDto.prototype, "businessId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlatformAdminContractSummaryQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlatformAdminContractSummaryQueryDto.prototype, "createdFrom", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlatformAdminContractSummaryQueryDto.prototype, "createdTo", void 0);
//# sourceMappingURL=platform-admin-contract-query.dto.js.map