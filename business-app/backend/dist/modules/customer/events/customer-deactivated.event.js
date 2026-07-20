"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerDeactivatedEvent = void 0;
const domain_event_base_1 = require("../../../shared/domain/events/domain-event.base");
class CustomerDeactivatedEvent extends domain_event_base_1.DomainEvent {
    static EVENT_NAME = 'customer.deactivated';
    payload;
    constructor(params) {
        super({ ...params, aggregateType: 'Customer' });
        this.payload = params.payload;
    }
}
exports.CustomerDeactivatedEvent = CustomerDeactivatedEvent;
//# sourceMappingURL=customer-deactivated.event.js.map