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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var OutboxService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const outbox_event_schema_1 = require("./outbox-event.schema");
let OutboxService = OutboxService_1 = class OutboxService {
    model;
    logger = new common_1.Logger(OutboxService_1.name);
    constructor(model) {
        this.model = model;
    }
    async append(event) {
        try {
            await this.model.create({
                eventId: event.eventId,
                eventName: event.constructor.EVENT_NAME ?? 'unknown',
                version: event.version,
                tenantId: event.tenantId,
                aggregateId: event.aggregateId,
                aggregateType: event.aggregateType,
                payload: event.payload,
                metadata: event.metadata,
                occurredAt: event.occurredAt,
                status: 'pending',
                attempts: 0,
                lastAttemptAt: null,
                deliveredAt: null,
                error: null,
            });
        }
        catch (err) {
            if (err?.code === 11000)
                return;
            this.logger.error(`Failed to append event ${event.eventId} to outbox: ${err?.message}`);
        }
    }
    async findPending(limit = 50) {
        return this.model
            .find({ status: 'pending', attempts: { $lte: 5 } })
            .sort({ occurredAt: 1 })
            .limit(limit)
            .exec();
    }
    async markDelivered(eventId) {
        await this.model.updateOne({ eventId }, { $set: { status: 'delivered', deliveredAt: new Date() } });
    }
    async markFailed(eventId, error) {
        const doc = await this.model.findOne({ eventId });
        if (!doc)
            return;
        const newAttempts = (doc.attempts ?? 0) + 1;
        const newStatus = newAttempts >= 5 ? 'dead_letter' : 'failed';
        await this.model.updateOne({ eventId }, {
            $set: {
                status: newStatus,
                attempts: newAttempts,
                lastAttemptAt: new Date(),
                error,
            },
        });
    }
};
exports.OutboxService = OutboxService;
exports.OutboxService = OutboxService = OutboxService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(outbox_event_schema_1.OutboxEvent.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], OutboxService);
//# sourceMappingURL=outbox.service.js.map