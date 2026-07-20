export interface DomainEventParams {
    aggregateId: string;
    aggregateType: string;
    tenantId: string;
    correlationId?: string;
    causationId?: string;
    version?: number;
    metadata?: Record<string, unknown>;
    occurredAt?: Date;
}
export declare abstract class DomainEvent {
    readonly eventId: string;
    readonly aggregateId: string;
    readonly aggregateType: string;
    readonly occurredAt: Date;
    readonly correlationId: string | undefined;
    readonly causationId: string | undefined;
    readonly tenantId: string;
    readonly version: number;
    readonly metadata: Record<string, unknown>;
    protected constructor(params: DomainEventParams);
}
