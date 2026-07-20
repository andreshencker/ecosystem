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
exports.ShiftSchema = exports.Shift = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let Shift = class Shift {
    businessId;
    contractId;
    customerId;
    date;
    startTime;
    endDate;
    endTime;
    breakMinutes;
    status;
    location;
    notes;
    linkedCalendarId;
    calendarProvider;
    calendarAccount;
    calendarId;
    calendarName;
    externalEventId;
    externalOccurrenceId;
    title;
    description;
    start;
    end;
    allDay;
    timezone;
    organizer;
    attendees;
    lastExternalUpdate;
    syncStatus;
    createdFromCalendar;
    contractAssigned;
    hourCalculationStatus;
    invoiceStatus;
    metadata;
};
exports.Shift = Shift;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Shift.prototype, "businessId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, index: true }),
    __metadata("design:type", Object)
], Shift.prototype, "contractId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, index: true }),
    __metadata("design:type", Object)
], Shift.prototype, "customerId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Shift.prototype, "date", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Shift.prototype, "startTime", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Shift.prototype, "endDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Shift.prototype, "endTime", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: null }),
    __metadata("design:type", Object)
], Shift.prototype, "breakMinutes", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        enum: ['draft', 'confirmed', 'cancelled'],
        default: 'draft',
    }),
    __metadata("design:type", String)
], Shift.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true }),
    __metadata("design:type", Object)
], Shift.prototype, "location", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true }),
    __metadata("design:type", Object)
], Shift.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, index: true }),
    __metadata("design:type", Object)
], Shift.prototype, "linkedCalendarId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Shift.prototype, "calendarProvider", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Shift.prototype, "calendarAccount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Shift.prototype, "calendarId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Shift.prototype, "calendarName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Shift.prototype, "externalEventId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Shift.prototype, "externalOccurrenceId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true }),
    __metadata("design:type", Object)
], Shift.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Shift.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], Shift.prototype, "start", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], Shift.prototype, "end", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], Shift.prototype, "allDay", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Shift.prototype, "timezone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Shift.prototype, "organizer", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Shift.prototype, "attendees", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], Shift.prototype, "lastExternalUpdate", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['pending', 'synced', 'deleted', 'error'],
        default: null,
    }),
    __metadata("design:type", Object)
], Shift.prototype, "syncStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], Shift.prototype, "createdFromCalendar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], Shift.prototype, "contractAssigned", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['pending', 'ready', 'calculated'],
        default: 'pending',
    }),
    __metadata("design:type", String)
], Shift.prototype, "hourCalculationStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['pending', 'invoiced'],
        default: 'pending',
    }),
    __metadata("design:type", String)
], Shift.prototype, "invoiceStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: null }),
    __metadata("design:type", Object)
], Shift.prototype, "metadata", void 0);
exports.Shift = Shift = __decorate([
    (0, mongoose_1.Schema)({
        collection: 'shifts',
        timestamps: true,
        versionKey: false,
    })
], Shift);
exports.ShiftSchema = mongoose_1.SchemaFactory.createForClass(Shift);
exports.ShiftSchema.index({ businessId: 1, date: 1 });
exports.ShiftSchema.index({ businessId: 1, contractId: 1 });
exports.ShiftSchema.index({ businessId: 1, status: 1 });
exports.ShiftSchema.index({ businessId: 1, createdFromCalendar: 1 });
exports.ShiftSchema.index({ businessId: 1, syncStatus: 1 });
exports.ShiftSchema.index({ businessId: 1, linkedCalendarId: 1 });
exports.ShiftSchema.index({ businessId: 1, externalOccurrenceId: 1 }, { unique: true, sparse: true, name: 'uniq_business_occurrence' });
//# sourceMappingURL=shift.schema.js.map