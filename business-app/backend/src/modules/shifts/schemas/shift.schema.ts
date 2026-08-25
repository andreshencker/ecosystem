import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ShiftStatus = 'draft' | 'confirmed' | 'cancelled';
export type SyncStatus = 'pending' | 'synced' | 'deleted' | 'error';
export type HourCalcStatus = 'pending' | 'ready' | 'calculated';
export type InvoiceStatus = 'pending' | 'invoiced';

export type ShiftDocument = HydratedDocument<Shift>;

@Schema({
  collection: 'shifts',
  timestamps: true,
  versionKey: false,
})
export class Shift {
  // ─── Core business fields ─────────────────────────────────────────────────

  @Prop({ required: true, index: true })
  businessId!: string;

  /** Null for calendar-imported shifts until the user assigns a contract. */
  @Prop({ type: String, default: null, index: true })
  contractId!: string | null;

  /** Denormalised for fast filtering. Null for calendar-imported shifts. */
  @Prop({ type: String, default: null, index: true })
  customerId!: string | null;

  /** ISO date string (YYYY-MM-DD) — local start date in the event's timezone. */
  @Prop({ required: true })
  date!: string;

  /** HH:mm — local start time in the event's timezone. */
  @Prop({ required: true })
  startTime!: string;

  /**
   * ISO date string (YYYY-MM-DD) — local end date in the event's timezone.
   * For same-day shifts this equals date. For overnight shifts this is the next calendar day.
   * Stored as optional to preserve backwards compatibility with existing records (defaults to date).
   */
  @Prop({ type: String, default: null })
  endDate!: string | null;

  /** HH:mm — local end time in the event's timezone. */
  @Prop({ required: true })
  endTime!: string;

  /**
   * Whether the worker took their contractual break during this shift.
   * The duration and conditions of the break are defined by the assigned Contract,
   * not by the Shift. BI resolves the applicable break duration at calculation time.
   */
  @Prop({ type: Boolean, default: false })
  breakTaken!: boolean;

  @Prop({
    required: true,
    enum: ['draft', 'confirmed', 'cancelled'],
    default: 'draft',
  })
  status!: ShiftStatus;

  @Prop({ type: String, default: null, trim: true })
  location!: string | null;

  @Prop({ type: String, default: null, trim: true })
  notes!: string | null;

  // ─── Calendar sync fields ─────────────────────────────────────────────────

  /** Reference to the LinkedCalendar document that produced this shift. */
  @Prop({ type: String, default: null, index: true })
  linkedCalendarId!: string | null;

  /** Provider key from the linked calendar (e.g. "icloud", "google_calendar"). */
  @Prop({ type: String, default: null })
  calendarProvider!: string | null;

  /** Account identifier (email) of the calendar account. */
  @Prop({ type: String, default: null })
  calendarAccount!: string | null;

  /** External calendar ID from Relay. */
  @Prop({ type: String, default: null })
  calendarId!: string | null;

  /** Display name of the source calendar. */
  @Prop({ type: String, default: null })
  calendarName!: string | null;

  /**
   * Original external event UID — shared by all occurrences of a recurring event.
   * Used to group occurrences of the same recurring series.
   */
  @Prop({ type: String, default: null })
  externalEventId!: string | null;

  /**
   * Unique occurrence identifier returned by Relay after RRULE expansion.
   * Format: uid_occurrenceStartISO for recurring, uid for single events.
   * Used as the upsert key for idempotent sync.
   */
  @Prop({ type: String, default: null })
  externalOccurrenceId!: string | null;

  /** Event title from the external calendar. */
  @Prop({ type: String, default: null, trim: true })
  title!: string | null;

  /** Full event description from the external calendar. */
  @Prop({ type: String, default: null })
  description!: string | null;

  /** Full ISO 8601 start timestamp (preserved alongside date/startTime). */
  @Prop({ type: Date, default: null })
  start!: Date | null;

  /** Full ISO 8601 end timestamp. */
  @Prop({ type: Date, default: null })
  end!: Date | null;

  /** True for all-day events. */
  @Prop({ type: Boolean, default: false })
  allDay!: boolean;

  /** IANA timezone string from the external event. */
  @Prop({ type: String, default: null })
  timezone!: string | null;

  /** Organizer email from the external event. */
  @Prop({ type: String, default: null })
  organizer!: string | null;

  /** Attendee emails from the external event. */
  @Prop({ type: [String], default: [] })
  attendees!: string[];

  /** Last modification timestamp reported by the external provider. */
  @Prop({ type: Date, default: null })
  lastExternalUpdate!: Date | null;

  /**
   * Sync lifecycle status:
   *   pending  — queued for first sync
   *   synced   — successfully imported/updated
   *   deleted  — event removed from external calendar; shift kept for audit
   *   error    — last sync attempt failed
   */
  @Prop({
    type: String,
    enum: ['pending', 'synced', 'deleted', 'error'],
    default: null,
  })
  syncStatus!: SyncStatus | null;

  /** True when this shift was created by the calendar sync engine. */
  @Prop({ type: Boolean, default: false })
  createdFromCalendar!: boolean;

  /** False until a user assigns a contract to this shift. */
  @Prop({ type: Boolean, default: false })
  contractAssigned!: boolean;

  /** Hour calculation lifecycle — pending until a contract is assigned. */
  @Prop({
    type: String,
    enum: ['pending', 'ready', 'calculated'],
    default: 'pending',
  })
  hourCalculationStatus!: HourCalcStatus;

  /** Invoice lifecycle — pending until hours are calculated and invoiced. */
  @Prop({
    type: String,
    enum: ['pending', 'invoiced'],
    default: 'pending',
  })
  invoiceStatus!: InvoiceStatus;

  /** Arbitrary provider-specific metadata preserved verbatim. */
  @Prop({ type: Object, default: null })
  metadata!: Record<string, any> | null;
}

export const ShiftSchema = SchemaFactory.createForClass(Shift);

// ─── Indexes ──────────────────────────────────────────────────────────────────

ShiftSchema.index({ businessId: 1, date: 1 });
ShiftSchema.index({ businessId: 1, contractId: 1 });
ShiftSchema.index({ businessId: 1, status: 1 });
ShiftSchema.index({ businessId: 1, createdFromCalendar: 1 });
ShiftSchema.index({ businessId: 1, syncStatus: 1 });
ShiftSchema.index({ businessId: 1, linkedCalendarId: 1 });

// Upsert key for calendar sync — one shift per occurrence per business.
ShiftSchema.index(
  { businessId: 1, externalOccurrenceId: 1 },
  { unique: true, sparse: true, name: 'uniq_business_occurrence' },
);
