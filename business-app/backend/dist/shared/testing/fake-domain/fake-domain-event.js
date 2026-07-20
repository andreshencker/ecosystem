"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FakeRenamedEvent = exports.FakeCreatedEvent = void 0;
const domain_event_base_1 = require("../../domain/events/domain-event.base");
class FakeCreatedEvent extends domain_event_base_1.DomainEvent {
    constructor(params) {
        super(params);
    }
}
exports.FakeCreatedEvent = FakeCreatedEvent;
class FakeRenamedEvent extends domain_event_base_1.DomainEvent {
    newName;
    constructor(params) {
        super(params);
        this.newName = params.newName;
    }
}
exports.FakeRenamedEvent = FakeRenamedEvent;
//# sourceMappingURL=fake-domain-event.js.map