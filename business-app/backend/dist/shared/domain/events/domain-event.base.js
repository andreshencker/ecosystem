"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainEvent = void 0;
const crypto_1 = require("crypto");
class DomainEvent {
    eventId;
    aggregateId;
    aggregateType;
    occurredAt;
    correlationId;
    causationId;
    tenantId;
    version;
    metadata;
    constructor(params) {
        this.eventId = (0, crypto_1.randomUUID)();
        this.aggregateId = params.aggregateId;
        this.aggregateType = params.aggregateType;
        this.tenantId = params.tenantId;
        this.occurredAt = params.occurredAt ?? new Date();
        this.correlationId = params.correlationId;
        this.causationId = params.causationId;
        this.version = params.version ?? 1;
        this.metadata = params.metadata ?? {};
    }
}
exports.DomainEvent = DomainEvent;
//# sourceMappingURL=domain-event.base.js.map