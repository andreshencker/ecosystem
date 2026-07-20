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
exports.SubscribeByUrlDto = void 0;
const class_validator_1 = require("class-validator");
const linked_calendar_schema_1 = require("../schemas/linked-calendar.schema");
const MAX_URL_LENGTH = 2048;
class SubscribeByUrlDto {
    connectionId;
    subscriptionUrl;
    calendarName;
    description;
    flow;
}
exports.SubscribeByUrlDto = SubscribeByUrlDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'connectionId is required' }),
    __metadata("design:type", String)
], SubscribeByUrlDto.prototype, "connectionId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Subscription URL is required' }),
    (0, class_validator_1.MaxLength)(MAX_URL_LENGTH, { message: `URL must be at most ${MAX_URL_LENGTH} characters` }),
    (0, class_validator_1.IsUrl)({ protocols: ['https'], require_protocol: true, require_tld: true }, { message: 'Subscription URL must be a valid HTTPS URL (e.g. https://example.org/calendar.ics)' }),
    (0, class_validator_1.Matches)(/^https:\/\//i, { message: 'Only HTTPS subscription URLs are accepted' }),
    __metadata("design:type", String)
], SubscribeByUrlDto.prototype, "subscriptionUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], SubscribeByUrlDto.prototype, "calendarName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], SubscribeByUrlDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(linked_calendar_schema_1.CALENDAR_FLOWS, { message: `flow must be one of: ${linked_calendar_schema_1.CALENDAR_FLOWS.join(', ')}` }),
    __metadata("design:type", String)
], SubscribeByUrlDto.prototype, "flow", void 0);
//# sourceMappingURL=subscribe-by-url.dto.js.map