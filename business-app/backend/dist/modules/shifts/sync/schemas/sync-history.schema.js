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
exports.SyncHistorySchema = exports.SyncHistory = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let SyncHistory = class SyncHistory {
    businessId;
    linkedCalendarId;
    calendarName;
    accountIdentifier;
    providerKey;
    startedAt;
    finishedAt;
    eventsReceived;
    created;
    updated;
    deleted;
    skipped;
    errors;
    durationMs;
    status;
};
exports.SyncHistory = SyncHistory;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], SyncHistory.prototype, "businessId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, index: true }),
    __metadata("design:type", Object)
], SyncHistory.prototype, "linkedCalendarId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], SyncHistory.prototype, "calendarName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], SyncHistory.prototype, "accountIdentifier", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], SyncHistory.prototype, "providerKey", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], SyncHistory.prototype, "startedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], SyncHistory.prototype, "finishedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], SyncHistory.prototype, "eventsReceived", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], SyncHistory.prototype, "created", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], SyncHistory.prototype, "updated", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], SyncHistory.prototype, "deleted", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], SyncHistory.prototype, "skipped", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], SyncHistory.prototype, "errors", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: null }),
    __metadata("design:type", Object)
], SyncHistory.prototype, "durationMs", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        enum: ['running', 'completed', 'failed'],
        default: 'running',
    }),
    __metadata("design:type", String)
], SyncHistory.prototype, "status", void 0);
exports.SyncHistory = SyncHistory = __decorate([
    (0, mongoose_1.Schema)({
        collection: 'shift_sync_history',
        timestamps: true,
        versionKey: false,
    })
], SyncHistory);
exports.SyncHistorySchema = mongoose_1.SchemaFactory.createForClass(SyncHistory);
exports.SyncHistorySchema.index({ businessId: 1, startedAt: -1 });
exports.SyncHistorySchema.index({ businessId: 1, linkedCalendarId: 1, startedAt: -1 });
//# sourceMappingURL=sync-history.schema.js.map