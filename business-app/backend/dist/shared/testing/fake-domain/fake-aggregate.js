"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FakeAggregate = void 0;
const crypto_1 = require("crypto");
const aggregate_root_base_1 = require("../../domain/entities/aggregate-root.base");
const fake_domain_event_1 = require("./fake-domain-event");
class FakeAggregate extends aggregate_root_base_1.AggregateRoot {
    _name;
    tenantId;
    constructor(id, tenantId, name) {
        super(id);
        this._name = name;
        this.tenantId = tenantId;
    }
    static create(tenantId, name, id) {
        const aggregateId = id ?? (0, crypto_1.randomUUID)();
        const aggregate = new FakeAggregate(aggregateId, tenantId, name);
        aggregate.addDomainEvent(new fake_domain_event_1.FakeCreatedEvent({
            aggregateId,
            aggregateType: 'FakeAggregate',
            tenantId,
        }));
        return aggregate;
    }
    get name() {
        return this._name;
    }
    rename(newName) {
        this._name = newName;
        this.addDomainEvent(new fake_domain_event_1.FakeRenamedEvent({
            aggregateId: this.id,
            aggregateType: 'FakeAggregate',
            tenantId: this.tenantId,
            newName,
        }));
    }
}
exports.FakeAggregate = FakeAggregate;
//# sourceMappingURL=fake-aggregate.js.map