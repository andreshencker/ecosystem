import { DomainEvent, DomainEventParams } from '../../../shared/domain/events/domain-event.base';
export interface CustomerUpdatedPayload {
    businessId: string;
    customerId: string;
    displayName: string;
    abn: string | null;
    email: string | null;
    isActive: boolean;
    updatedAt: string;
    changedFields: string[];
}
export declare class CustomerUpdatedEvent extends DomainEvent {
    static readonly EVENT_NAME = "customer.updated";
    readonly payload: CustomerUpdatedPayload;
    constructor(params: Omit<DomainEventParams, 'aggregateType'> & {
        payload: CustomerUpdatedPayload;
    });
}
