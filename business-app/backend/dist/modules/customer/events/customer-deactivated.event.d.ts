import { DomainEvent, DomainEventParams } from '../../../shared/domain/events/domain-event.base';
export interface CustomerDeactivatedPayload {
    businessId: string;
    customerId: string;
    deactivatedAt: string;
}
export declare class CustomerDeactivatedEvent extends DomainEvent {
    static readonly EVENT_NAME = "customer.deactivated";
    readonly payload: CustomerDeactivatedPayload;
    constructor(params: Omit<DomainEventParams, 'aggregateType'> & {
        payload: CustomerDeactivatedPayload;
    });
}
