import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SyncHistoryStatus = 'running' | 'completed' | 'failed';
export type SyncHistoryDocument = HydratedDocument<SyncHistory>;

@Schema({
  collection: 'shift_sync_history',
  timestamps: true,
  versionKey: false,
})
export class SyncHistory {
  @Prop({ required: true, index: true })
  businessId!: string;

  /** The LinkedCalendar document that was synced. */
  @Prop({ type: String, default: null, index: true })
  linkedCalendarId!: string | null;

  /** Human-readable calendar name for quick reads. */
  @Prop({ type: String, default: null })
  calendarName!: string | null;

  @Prop({ type: String, default: null })
  accountIdentifier!: string | null;

  @Prop({ type: String, default: null })
  providerKey!: string | null;

  @Prop({ required: true })
  startedAt!: Date;

  @Prop({ type: Date, default: null })
  finishedAt!: Date | null;

  @Prop({ type: Number, default: 0 })
  eventsReceived!: number;

  @Prop({ type: Number, default: 0 })
  created!: number;

  @Prop({ type: Number, default: 0 })
  updated!: number;

  @Prop({ type: Number, default: 0 })
  deleted!: number;

  @Prop({ type: Number, default: 0 })
  skipped!: number;

  @Prop({ type: [String], default: [] })
  errors!: string[];

  /** Duration in milliseconds. */
  @Prop({ type: Number, default: null })
  durationMs!: number | null;

  @Prop({
    required: true,
    enum: ['running', 'completed', 'failed'],
    default: 'running',
  })
  status!: SyncHistoryStatus;
}

export const SyncHistorySchema = SchemaFactory.createForClass(SyncHistory);

SyncHistorySchema.index({ businessId: 1, startedAt: -1 });
SyncHistorySchema.index({ businessId: 1, linkedCalendarId: 1, startedAt: -1 });
