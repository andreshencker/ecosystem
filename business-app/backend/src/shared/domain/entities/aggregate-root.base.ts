import { DomainEvent } from '../events/domain-event.base';
import { Entity } from './entity.base';

export abstract class AggregateRoot<TId> extends Entity<TId> {
  private _domainEvents: DomainEvent[] = [];

  get domainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  /**
   * Atomically returns all pending events and clears the internal list.
   * Use this instead of reading domainEvents + clearDomainEvents() separately.
   */
  pullDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
