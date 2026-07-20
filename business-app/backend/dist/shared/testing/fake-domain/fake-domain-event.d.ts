import { DomainEvent, DomainEventParams } from '../../domain/events/domain-event.base';
export declare class FakeCreatedEvent extends DomainEvent {
    constructor(params: Omit<DomainEventParams, 'occurredAt'> & {
        occurredAt?: Date;
    });
}
export declare class FakeRenamedEvent extends DomainEvent {
    readonly newName: string;
    constructor(params: Omit<DomainEventParams, 'occurredAt'> & {
        occurredAt?: Date;
        newName: string;
    });
}
