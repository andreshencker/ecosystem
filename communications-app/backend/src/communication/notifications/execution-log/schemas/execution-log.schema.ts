import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RenderStatus = 'success' | 'failed';
export type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'skipped';
export type ExecutionChannel = 'email' | 'sms';

export type NotificationExecutionLogDocument = HydratedDocument<NotificationExecutionLog> & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({
  collection: 'notification_execution_logs',
  versionKey: false,
  timestamps: true,
})
export class NotificationExecutionLog {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  domainKey!: string;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  eventKey!: string;

  // Composite identity — domainKey + "." + eventKey (DEC-018 §6.2)
  @Prop({ required: true, trim: true, lowercase: true, index: true })
  canonicalEventKey!: string;

  @Prop({ required: true, enum: ['email', 'sms'], index: true })
  channel!: ExecutionChannel;

  // Resolved during rendering phase — null for SMS (no layout) or on render failure
  @Prop({ type: Types.ObjectId, ref: 'LayoutTemplate', default: null })
  layoutTemplateId!: Types.ObjectId | null;

  // Resolved during rendering phase — null for SMS or on render failure
  @Prop({ type: Types.ObjectId, ref: 'CompanyTheme', default: null })
  themeId!: Types.ObjectId | null;

  // Resolved during delivery phase — null when delivery was skipped
  @Prop({ type: Types.ObjectId, ref: 'Provider', default: null })
  providerId!: Types.ObjectId | null;

  // Resolved during delivery phase — null when delivery was skipped
  @Prop({ type: Types.ObjectId, ref: 'ProviderCredentials', default: null })
  providerCredentialsId!: Types.ObjectId | null;

  @Prop({ required: true, enum: ['success', 'failed'], index: true })
  renderStatus!: RenderStatus;

  @Prop({ required: true, enum: ['pending', 'sent', 'failed', 'skipped'], index: true })
  deliveryStatus!: DeliveryStatus;

  // Timestamp at which the rendering phase completed (null if rendering failed before completing)
  @Prop({ type: Date, default: null })
  renderedAt!: Date | null;

  // Timestamp at which the delivery phase completed (null if not yet delivered or delivery was skipped)
  @Prop({ type: Date, default: null })
  sentAt!: Date | null;

  // External message ID returned by the provider (null if unavailable or delivery failed)
  @Prop({ type: String, default: null })
  providerMessageId!: string | null;

  // Human-readable error description — populated on render or delivery failure
  @Prop({ type: String, default: null })
  errorMessage!: string | null;
}

export const NotificationExecutionLogSchema = SchemaFactory.createForClass(NotificationExecutionLog);

NotificationExecutionLogSchema.index(
  { companyId: 1, createdAt: -1 },
  { name: 'idx_execlog_company_created' },
);

NotificationExecutionLogSchema.index(
  { companyId: 1, canonicalEventKey: 1, createdAt: -1 },
  { name: 'idx_execlog_company_eventkey_created' },
);

NotificationExecutionLogSchema.index(
  { deliveryStatus: 1, createdAt: -1 },
  { name: 'idx_execlog_delivery_created' },
);
