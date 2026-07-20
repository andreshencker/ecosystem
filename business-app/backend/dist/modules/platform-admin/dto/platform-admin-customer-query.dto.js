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
exports.PlatformAdminCustomerQueryDto = void 0;
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
class PlatformAdminCustomerQueryDto {
    search;
    businessId;
    customerType;
    isActive;
    hasContacts;
    hasLocations;
    hasCommunicationConfiguration;
    hasDataQualityIssues;
    page;
    limit;
    sortBy;
    sortDirection;
}
exports.PlatformAdminCustomerQueryDto = PlatformAdminCustomerQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Search by name, ABN, contact name, or email' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlatformAdminCustomerQueryDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by tenant businessId' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlatformAdminCustomerQueryDto.prototype, "businessId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['company', 'individual'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['company', 'individual']),
    __metadata("design:type", String)
], PlatformAdminCustomerQueryDto.prototype, "customerType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => toBoolean(value)),
    __metadata("design:type", Boolean)
], PlatformAdminCustomerQueryDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => toBoolean(value)),
    __metadata("design:type", Boolean)
], PlatformAdminCustomerQueryDto.prototype, "hasContacts", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => toBoolean(value)),
    __metadata("design:type", Boolean)
], PlatformAdminCustomerQueryDto.prototype, "hasLocations", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => toBoolean(value)),
    __metadata("design:type", Boolean)
], PlatformAdminCustomerQueryDto.prototype, "hasCommunicationConfiguration", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => toBoolean(value)),
    __metadata("design:type", Boolean)
], PlatformAdminCustomerQueryDto.prototype, "hasDataQualityIssues", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 1, minimum: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_transformer_1.Transform)(({ value }) => toInt(value)),
    __metadata("design:type", Number)
], PlatformAdminCustomerQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 50, minimum: 1, maximum: 200 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(200),
    (0, class_transformer_1.Transform)(({ value }) => toInt(value)),
    __metadata("design:type", Number)
], PlatformAdminCustomerQueryDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlatformAdminCustomerQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['asc', 'desc'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlatformAdminCustomerQueryDto.prototype, "sortDirection", void 0);
//# sourceMappingURL=platform-admin-customer-query.dto.js.map