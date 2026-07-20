import {
  DomainEvent,
  DomainEventParams,
} from '../../domain/events/domain-event.base';

export class FakeCreatedEvent extends DomainEvent {
  constructor(
    params: Omit<DomainEventParams, 'occurredAt'> & { occurredAt?: Date },
  ) {
    super(params);
  }
}

export class FakeRenamedEvent extends DomainEvent {
  readonly newName: string;

  constructor(
    params: Omit<DomainEventParams, 'occurredAt'> & {
      occurredAt?: Date;
      newName: string;
    },
  ) {
    super(params);
    this.newName = params.newName;
  }
}
