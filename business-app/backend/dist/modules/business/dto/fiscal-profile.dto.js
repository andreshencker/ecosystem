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
exports.UpdateFiscalProfileDto = exports.UpdateDepositAccountDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class UpdateDepositAccountDto {
    bsb;
    accountNumber;
}
exports.UpdateDepositAccountDto = UpdateDepositAccountDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{6}$/, { message: 'bsb must be exactly 6 digits' }),
    __metadata("design:type", String)
], UpdateDepositAccountDto.prototype, "bsb", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], UpdateDepositAccountDto.prototype, "accountNumber", void 0);
class UpdateFiscalProfileDto {
    abn;
    depositAccount;
    defaultCurrency;
}
exports.UpdateFiscalProfileDto = UpdateFiscalProfileDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{11}$/, { message: 'abn must be exactly 11 digits' }),
    __metadata("design:type", String)
], UpdateFiscalProfileDto.prototype, "abn", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => UpdateDepositAccountDto),
    __metadata("design:type", UpdateDepositAccountDto)
], UpdateFiscalProfileDto.prototype, "depositAccount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(3),
    __metadata("design:type", String)
], UpdateFiscalProfileDto.prototype, "defaultCurrency", void 0);
//# sourceMappingURL=fiscal-profile.dto.js.map