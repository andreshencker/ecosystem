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
exports.LinkCalendarsDto = void 0;
const class_validator_1 = require("class-validator");
const linked_calendar_schema_1 = require("../schemas/linked-calendar.schema");
class LinkCalendarsDto {
    connectionId;
    calendarIds;
    flow;
}
exports.LinkCalendarsDto = LinkCalendarsDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'connectionId is required' }),
    __metadata("design:type", String)
], LinkCalendarsDto.prototype, "connectionId", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1, { message: 'At least one calendarId must be provided' }),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsNotEmpty)({ each: true }),
    __metadata("design:type", Array)
], LinkCalendarsDto.prototype, "calendarIds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(linked_calendar_schema_1.CALENDAR_FLOWS, { message: `flow must be one of: ${linked_calendar_schema_1.CALENDAR_FLOWS.join(', ')}` }),
    __metadata("design:type", Object)
], LinkCalendarsDto.prototype, "flow", void 0);
//# sourceMappingURL=link-calendars.dto.js.map