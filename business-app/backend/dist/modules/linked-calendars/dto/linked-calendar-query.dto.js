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
exports.LinkedCalendarQueryDto = void 0;
const class_validator_1 = require("class-validator");
const linked_calendar_schema_1 = require("../schemas/linked-calendar.schema");
class LinkedCalendarQueryDto {
    connectionId;
    providerKey;
    status;
    flow;
    search;
}
exports.LinkedCalendarQueryDto = LinkedCalendarQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LinkedCalendarQueryDto.prototype, "connectionId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LinkedCalendarQueryDto.prototype, "providerKey", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['active', 'paused']),
    __metadata("design:type", String)
], LinkedCalendarQueryDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(linked_calendar_schema_1.CALENDAR_FLOWS, { message: `flow must be one of: ${linked_calendar_schema_1.CALENDAR_FLOWS.join(', ')}` }),
    __metadata("design:type", String)
], LinkedCalendarQueryDto.prototype, "flow", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LinkedCalendarQueryDto.prototype, "search", void 0);
//# sourceMappingURL=linked-calendar-query.dto.js.map