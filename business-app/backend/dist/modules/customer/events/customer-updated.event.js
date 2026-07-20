"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerUpdatedEvent = void 0;
const domain_event_base_1 = require("../../../shared/domain/events/domain-event.base");
class CustomerUpdatedEvent extends domain_event_base_1.DomainEvent {
    static EVENT_NAME = 'customer.updated';
    payload;
    constructor(params) {
        super({ ...params, aggregateType: 'Customer' });
        this.payload = params.payload;
    }
}
exports.CustomerUpdatedEvent = CustomerUpdatedEvent;
//# sourceMappingURL=customer-updated.event.js.map