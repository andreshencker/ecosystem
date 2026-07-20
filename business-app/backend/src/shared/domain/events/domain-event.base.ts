import { randomUUID } from 'crypto';

export interface DomainEventParams {
  aggregateId: string;
  aggregateType: string;
  tenantId: string;
  correlationId?: string;
  causationId?: string;
  version?: number;
  metadata?: Record<string, unknown>;
  /** Explicit timestamp — supply when rehydrating a persisted event. Defaults to now. */
  occurredAt?: Date;
}

export abstract class DomainEvent {
  readonly eventId: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly occurredAt: Date;
  readonly correlationId: string | undefined;
  readonly causationId: string | undefined;
  readonly tenantId: string;
  readonly version: number;
  readonly metadata: Record<string, unknown>;

  protected constructor(params: DomainEventParams) {
    this.eventId = randomUUID();
    this.aggregateId = params.aggregateId;
    this.aggregateType = params.aggregateType;
    this.tenantId = params.tenantId;
    this.occurredAt = params.occurredAt ?? new Date();
    this.correlationId = params.correlationId;
    this.causationId = params.causationId;
    this.version = params.version ?? 1;
    this.metadata = params.metadata ?? {};
  }
}
