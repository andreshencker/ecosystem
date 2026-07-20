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
exports.UpdateLinkedCalendarDto = void 0;
const class_validator_1 = require("class-validator");
const linked_calendar_schema_1 = require("../schemas/linked-calendar.schema");
class UpdateLinkedCalendarDto {
    status;
    flow;
}
exports.UpdateLinkedCalendarDto = UpdateLinkedCalendarDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['active', 'paused'], { message: 'status must be active or paused' }),
    __metadata("design:type", String)
], UpdateLinkedCalendarDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)([...linked_calendar_schema_1.CALENDAR_FLOWS, null], {
        message: `flow must be one of: ${linked_calendar_schema_1.CALENDAR_FLOWS.join(', ')} or null`,
    }),
    __metadata("design:type", Object)
], UpdateLinkedCalendarDto.prototype, "flow", void 0);
//# sourceMappingURL=update-linked-calendar.dto.js.map