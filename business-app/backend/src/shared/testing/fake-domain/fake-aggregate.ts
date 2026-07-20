import { randomUUID } from 'crypto';
import { AggregateRoot } from '../../domain/entities/aggregate-root.base';
import { FakeCreatedEvent, FakeRenamedEvent } from './fake-domain-event';

export class FakeAggregate extends AggregateRoot<string> {
  private _name: string;
  readonly tenantId: string;

  private constructor(id: string, tenantId: string, name: string) {
    super(id);
    this._name = name;
    this.tenantId = tenantId;
  }

  static create(tenantId: string, name: string, id?: string): FakeAggregate {
    const aggregateId = id ?? randomUUID();
    const aggregate = new FakeAggregate(aggregateId, tenantId, name);
    aggregate.addDomainEvent(
      new FakeCreatedEvent({
        aggregateId,
        aggregateType: 'FakeAggregate',
        tenantId,
      }),
    );
    return aggregate;
  }

  get name(): string {
    return this._name;
  }

  rename(newName: string): void {
    this._name = newName;
    this.addDomainEvent(
      new FakeRenamedEvent({
        aggregateId: this.id,
        aggregateType: 'FakeAggregate',
        tenantId: this.tenantId,
        newName,
      }),
    );
  }
}
