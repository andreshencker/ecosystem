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
exports.IntegrationConnectionResponseDto = exports.ToggleConnectionDto = exports.TestConnectionDto = exports.SaveConnectionDto = void 0;
const class_validator_1 = require("class-validator");
class SaveConnectionDto {
    token;
    isActive;
}
exports.SaveConnectionDto = SaveConnectionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SaveConnectionDto.prototype, "token", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SaveConnectionDto.prototype, "isActive", void 0);
class TestConnectionDto {
    token;
}
exports.TestConnectionDto = TestConnectionDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TestConnectionDto.prototype, "token", void 0);
class ToggleConnectionDto {
    isActive;
}
exports.ToggleConnectionDto = ToggleConnectionDto;
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ToggleConnectionDto.prototype, "isActive", void 0);
class IntegrationConnectionResponseDto {
    id;
    provider;
    tokenPrefix;
    isActive;
    remoteCompanyId;
    lastTestedAt;
    lastStatus;
    lastError;
    createdAt;
    updatedAt;
    static from(doc) {
        return {
            id: String(doc._id),
            provider: doc.provider ?? 'communications',
            tokenPrefix: doc.tokenPrefix ?? '',
            isActive: doc.isActive ?? true,
            remoteCompanyId: doc.remoteCompanyId ?? null,
            lastTestedAt: doc.lastTestedAt
                ? new Date(doc.lastTestedAt).toISOString()
                : null,
            lastStatus: doc.lastStatus ?? null,
            lastError: doc.lastError ?? null,
            createdAt: new Date(doc.createdAt).toISOString(),
            updatedAt: new Date(doc.updatedAt).toISOString(),
        };
    }
}
exports.IntegrationConnectionResponseDto = IntegrationConnectionResponseDto;
//# sourceMappingURL=communication-connection.dto.js.map