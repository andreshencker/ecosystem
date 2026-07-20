import { DomainEvent } from '../domain/events/domain-event.base';
export declare abstract class EventPublisher {
    abstract publish(event: DomainEvent): Promise<void>;
    abstract publishAll(events: DomainEvent[]): Promise<void>;
}
