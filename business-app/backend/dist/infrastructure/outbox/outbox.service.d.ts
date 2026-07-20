import { Model } from 'mongoose';
import { DomainEvent } from '../../shared/domain/events/domain-event.base';
import { OutboxEventDocument } from './outbox-event.schema';
export declare class OutboxService {
    private readonly model;
    private readonly logger;
    constructor(model: Model<OutboxEventDocument>);
    append(event: DomainEvent & {
        payload: any;
    }): Promise<void>;
    findPending(limit?: number): Promise<OutboxEventDocument[]>;
    markDelivered(eventId: string): Promise<void>;
    markFailed(eventId: string, error: string): Promise<void>;
}
