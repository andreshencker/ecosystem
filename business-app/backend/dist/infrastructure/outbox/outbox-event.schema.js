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
exports.OutboxEventSchema = exports.OutboxEvent = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let OutboxEvent = class OutboxEvent {
    eventId;
    eventName;
    version;
    tenantId;
    aggregateId;
    aggregateType;
    payload;
    metadata;
    occurredAt;
    status;
    attempts;
    lastAttemptAt;
    deliveredAt;
    error;
};
exports.OutboxEvent = OutboxEvent;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], OutboxEvent.prototype, "eventId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], OutboxEvent.prototype, "eventName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], OutboxEvent.prototype, "version", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], OutboxEvent.prototype, "tenantId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], OutboxEvent.prototype, "aggregateId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], OutboxEvent.prototype, "aggregateType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, required: true }),
    __metadata("design:type", Object)
], OutboxEvent.prototype, "payload", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], OutboxEvent.prototype, "metadata", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], OutboxEvent.prototype, "occurredAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        enum: ['pending', 'delivered', 'failed', 'dead_letter'],
        default: 'pending',
        index: true,
    }),
    __metadata("design:type", String)
], OutboxEvent.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], OutboxEvent.prototype, "attempts", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], OutboxEvent.prototype, "lastAttemptAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], OutboxEvent.prototype, "deliveredAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], OutboxEvent.prototype, "error", void 0);
exports.OutboxEvent = OutboxEvent = __decorate([
    (0, mongoose_1.Schema)({
        collection: 'domain_events_outbox',
        timestamps: false,
        versionKey: false,
    })
], OutboxEvent);
exports.OutboxEventSchema = mongoose_1.SchemaFactory.createForClass(OutboxEvent);
exports.OutboxEventSchema.index({ status: 1, occurredAt: 1 });
exports.OutboxEventSchema.index({ tenantId: 1, eventName: 1, occurredAt: -1 });
//# sourceMappingURL=outbox-event.schema.js.map