import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LinkedCalendarStatus = 'active' | 'paused';

export type CalendarFlow = 'holidays' | 'shifts' | 'payments';
export const CALENDAR_FLOWS: CalendarFlow[] = [
  'holidays',
  'shifts',
  'payments',
];

export type LinkedCalendarDocument = HydratedDocument<LinkedCalendar>;

@Schema({
  collection: 'linked_calendars',
  timestamps: true,
  versionKey: false,
})
export class LinkedCalendar {
  /** Business App tenant ID — always from AuthContext, never from body. */
  @Prop({ required: true, index: true })
  companyId!: string;

  /** Provider credential ID from Relay App. */
  @Prop({ required: true, index: true })
  connectionId!: string;

  /** Provider key returned by Relay (e.g. "icloud", "google_calendar"). */
  @Prop({ required: true, trim: true })
  providerKey!: string;

  /** Human-readable provider name returned by Relay. */
  @Prop({ required: true, trim: true })
  providerDisplayName!: string;

  /** Account email / display identifier from Relay (not secret). */
  @Prop({ required: true, trim: true })
  accountIdentifier!: string;

  /** External calendar ID or URL returned by Relay. */
  @Prop({ required: true, trim: true })
  externalCalendarId!: string;

  /** Visible calendar name. */
  @Prop({ required: true, trim: true })
  calendarName!: string;

  @Prop({ type: String, default: null, trim: true })
  calendarDescription!: string | null;

  @Prop({ type: String, default: null, trim: true })
  timezone!: string | null;

  /** Access role returned by Relay (e.g. "owner", "read-write", "read-only"). */
  @Prop({ type: String, default: null, trim: true })
  accessRole!: string | null;

  @Prop({ type: Boolean, default: false })
  isPrimary!: boolean;

  @Prop({
    required: true,
    enum: ['active', 'paused'],
    default: 'active',
  })
  status!: LinkedCalendarStatus;

  /**
   * Business flow this calendar is configured for.
   * null for existing calendars that have not yet been assigned a flow.
   */
  @Prop({
    type: String,
    enum: ['holidays', 'shifts', 'payments', null],
    default: null,
  })
  flow!: CalendarFlow | null;

  /** UserId (Business App) of the user who created/last modified this link. */
  @Prop({ type: String, default: null })
  linkedByUserId!: string | null;
}

export const LinkedCalendarSchema =
  SchemaFactory.createForClass(LinkedCalendar);

// Prevent duplicate: same Business + same connection + same external calendar
LinkedCalendarSchema.index(
  { companyId: 1, connectionId: 1, externalCalendarId: 1 },
  { unique: true },
);

LinkedCalendarSchema.index({ companyId: 1, status: 1 });
LinkedCalendarSchema.index({ companyId: 1, connectionId: 1 });
LinkedCalendarSchema.index({ companyId: 1, providerKey: 1 });
