import { DomainEvent } from '../events/domain-event.base';
import { Entity } from './entity.base';
export declare abstract class AggregateRoot<TId> extends Entity<TId> {
    private _domainEvents;
    get domainEvents(): ReadonlyArray<DomainEvent>;
    protected addDomainEvent(event: DomainEvent): void;
    pullDomainEvents(): DomainEvent[];
    clearDomainEvents(): void;
}
