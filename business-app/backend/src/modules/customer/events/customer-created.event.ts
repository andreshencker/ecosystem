import {
  DomainEvent,
  DomainEventParams,
} from '../../../shared/domain/events/domain-event.base';

export interface CustomerCreatedPayload {
  businessId: string;
  customerId: string;
  displayName: string;
  customerType: 'company' | 'individual';
  abn: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class CustomerCreatedEvent extends DomainEvent {
  static readonly EVENT_NAME = 'customer.created';

  readonly payload: CustomerCreatedPayload;

  constructor(
    params: Omit<DomainEventParams, 'aggregateType'> & {
      payload: CustomerCreatedPayload;
    },
  ) {
    super({ ...params, aggregateType: 'Customer' });
    this.payload = params.payload;
  }
}
