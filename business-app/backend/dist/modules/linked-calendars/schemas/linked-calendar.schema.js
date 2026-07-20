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
exports.LinkedCalendarSchema = exports.LinkedCalendar = exports.CALENDAR_FLOWS = void 0;
const mongoose_1 = require("@nestjs/mongoose");
exports.CALENDAR_FLOWS = ['holidays', 'shifts', 'payments'];
let LinkedCalendar = class LinkedCalendar {
    companyId;
    connectionId;
    providerKey;
    providerDisplayName;
    accountIdentifier;
    externalCalendarId;
    calendarName;
    calendarDescription;
    timezone;
    accessRole;
    isPrimary;
    status;
    flow;
    linkedByUserId;
};
exports.LinkedCalendar = LinkedCalendar;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], LinkedCalendar.prototype, "companyId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], LinkedCalendar.prototype, "connectionId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], LinkedCalendar.prototype, "providerKey", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], LinkedCalendar.prototype, "providerDisplayName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], LinkedCalendar.prototype, "accountIdentifier", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], LinkedCalendar.prototype, "externalCalendarId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], LinkedCalendar.prototype, "calendarName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true }),
    __metadata("design:type", Object)
], LinkedCalendar.prototype, "calendarDescription", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true }),
    __metadata("design:type", Object)
], LinkedCalendar.prototype, "timezone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true }),
    __metadata("design:type", Object)
], LinkedCalendar.prototype, "accessRole", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], LinkedCalendar.prototype, "isPrimary", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        enum: ['active', 'paused'],
        default: 'active',
    }),
    __metadata("design:type", String)
], LinkedCalendar.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['holidays', 'shifts', 'payments', null],
        default: null,
    }),
    __metadata("design:type", Object)
], LinkedCalendar.prototype, "flow", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], LinkedCalendar.prototype, "linkedByUserId", void 0);
exports.LinkedCalendar = LinkedCalendar = __decorate([
    (0, mongoose_1.Schema)({
        collection: 'linked_calendars',
        timestamps: true,
        versionKey: false,
    })
], LinkedCalendar);
exports.LinkedCalendarSchema = mongoose_1.SchemaFactory.createForClass(LinkedCalendar);
exports.LinkedCalendarSchema.index({ companyId: 1, connectionId: 1, externalCalendarId: 1 }, { unique: true });
exports.LinkedCalendarSchema.index({ companyId: 1, status: 1 });
exports.LinkedCalendarSchema.index({ companyId: 1, connectionId: 1 });
exports.LinkedCalendarSchema.index({ companyId: 1, providerKey: 1 });
//# sourceMappingURL=linked-calendar.schema.js.map