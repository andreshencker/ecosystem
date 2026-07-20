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
exports.CreateCommunicationEventDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateCommunicationEventDto {
    domainCatalogueId;
    eventKey;
    displayName;
    description;
    eventType;
    channelContent;
    isActive;
}
exports.CreateCommunicationEventDto = CreateCommunicationEventDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Communication Purpose (domain) ObjectId', example: '64f...' }),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], CreateCommunicationEventDto.prototype, "domainCatalogueId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'invoice_sent', description: 'Unique key — lowercase letters, numbers, hyphens and underscores' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateCommunicationEventDto.prototype, "eventKey", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Invoice Sent' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateCommunicationEventDto.prototype, "displayName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Triggered when an invoice is sent to a customer' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCommunicationEventDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['notification', 'alert', 'request', 'security'] }),
    (0, class_validator_1.IsEnum)(['notification', 'alert', 'request', 'security']),
    __metadata("design:type", String)
], CreateCommunicationEventDto.prototype, "eventType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Channel content configuration for email and/or SMS',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateCommunicationEventDto.prototype, "channelContent", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateCommunicationEventDto.prototype, "isActive", void 0);
//# sourceMappingURL=create-communication-event.dto.js.map