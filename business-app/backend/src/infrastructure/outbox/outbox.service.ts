import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DomainEvent } from '../../shared/domain/events/domain-event.base';
import { OutboxEvent, OutboxEventDocument } from './outbox-event.schema';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    @InjectModel(OutboxEvent.name)
    private readonly model: Model<OutboxEventDocument>,
  ) {}

  /**
   * Appends a domain event to the outbox.
   * Must be called AFTER the aggregate is saved to the database.
   * Idempotent: duplicate eventId is silently ignored.
   */

  async append(event: DomainEvent & { payload: any }): Promise<void> {
    try {
      await this.model.create({
        eventId: event.eventId,
        eventName: (event.constructor as any).EVENT_NAME ?? 'unknown',
        version: event.version,
        tenantId: event.tenantId,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        payload: event.payload,
        metadata: event.metadata,
        occurredAt: event.occurredAt,
        status: 'pending',
        attempts: 0,
        lastAttemptAt: null,
        deliveredAt: null,
        error: null,
      });
    } catch (err: any) {
      // Duplicate key = same eventId already in outbox — idempotent, not an error
      if (err?.code === 11000) return;
      this.logger.error(
        `Failed to append event ${event.eventId} to outbox: ${err?.message}`,
      );
      // Do not re-throw: outbox failure must never block the main operation
    }
  }

  /** Returns pending events ordered by occurredAt for processing. */
  async findPending(limit = 50): Promise<OutboxEventDocument[]> {
    return this.model
      .find({ status: 'pending', attempts: { $lte: 5 } })
      .sort({ occurredAt: 1 })
      .limit(limit)
      .exec();
  }

  async markDelivered(eventId: string): Promise<void> {
    await this.model.updateOne(
      { eventId },
      { $set: { status: 'delivered', deliveredAt: new Date() } },
    );
  }

  async markFailed(eventId: string, error: string): Promise<void> {
    const doc = await this.model.findOne({ eventId });
    if (!doc) return;
    const newAttempts = (doc.attempts ?? 0) + 1;
    const newStatus = newAttempts >= 5 ? 'dead_letter' : 'failed';
    await this.model.updateOne(
      { eventId },
      {
        $set: {
          status: newStatus,
          attempts: newAttempts,
          lastAttemptAt: new Date(),
          error,
        },
      },
    );
  }
}
