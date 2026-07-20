"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerCreatedEvent = void 0;
const domain_event_base_1 = require("../../../shared/domain/events/domain-event.base");
class CustomerCreatedEvent extends domain_event_base_1.DomainEvent {
    static EVENT_NAME = 'customer.created';
    payload;
    constructor(params) {
        super({ ...params, aggregateType: 'Customer' });
        this.payload = params.payload;
    }
}
exports.CustomerCreatedEvent = CustomerCreatedEvent;
//# sourceMappingURL=customer-created.event.js.map