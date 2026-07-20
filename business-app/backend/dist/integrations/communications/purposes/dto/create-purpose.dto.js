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
exports.CreatePurposeDto = exports.ChannelToUseInputDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class ChannelToUseInputDto {
    channel;
    providerCredentialsId;
}
exports.ChannelToUseInputDto = ChannelToUseInputDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['email', 'sms'] }),
    (0, class_validator_1.IsEnum)(['email', 'sms']),
    __metadata("design:type", String)
], ChannelToUseInputDto.prototype, "channel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ProviderCredentials ObjectId from Communications' }),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], ChannelToUseInputDto.prototype, "providerCredentialsId", void 0);
class CreatePurposeDto {
    domainKey;
    displayName;
    domainCategory;
    isActive;
    channelsToUse;
}
exports.CreatePurposeDto = CreatePurposeDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'invoicing', description: 'Unique key for this purpose (lowercase, immutable after creation)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreatePurposeDto.prototype, "domainKey", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Invoicing', description: 'User-facing display name' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CreatePurposeDto.prototype, "displayName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'billing', description: 'Category grouping (e.g. billing, support, marketing)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreatePurposeDto.prototype, "domainCategory", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreatePurposeDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [ChannelToUseInputDto] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ChannelToUseInputDto),
    __metadata("design:type", Array)
], CreatePurposeDto.prototype, "channelsToUse", void 0);
//# sourceMappingURL=create-purpose.dto.js.map