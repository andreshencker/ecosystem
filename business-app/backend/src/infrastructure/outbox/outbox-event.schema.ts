import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OutboxEventStatus =
  'pending' | 'delivered' | 'failed' | 'dead_letter';
export type OutboxEventDocument = HydratedDocument<OutboxEvent>;

@Schema({
  collection: 'domain_events_outbox',
  timestamps: false,
  versionKey: false,
})
export class OutboxEvent {
  @Prop({ required: true, unique: true, index: true })
  eventId!: string;

  @Prop({ required: true, index: true })
  eventName!: string;

  @Prop({ required: true })
  version!: number;

  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true })
  aggregateId!: string;

  @Prop({ required: true })
  aggregateType!: string;

  @Prop({ type: Object, required: true })
  payload!: Record<string, unknown>;

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, unknown>;

  @Prop({ required: true })
  occurredAt!: Date;

  @Prop({
    required: true,
    enum: ['pending', 'delivered', 'failed', 'dead_letter'],
    default: 'pending',
    index: true,
  })
  status!: OutboxEventStatus;

  @Prop({ default: 0 })
  attempts!: number;

  @Prop({ type: Date, default: null })
  lastAttemptAt!: Date | null;

  @Prop({ type: Date, default: null })
  deliveredAt!: Date | null;

  @Prop({ type: String, default: null })
  error!: string | null;
}

export const OutboxEventSchema = SchemaFactory.createForClass(OutboxEvent);
OutboxEventSchema.index({ status: 1, occurredAt: 1 });
OutboxEventSchema.index({ tenantId: 1, eventName: 1, occurredAt: -1 });
