import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ConnectPaymentExecutionDocument =
  HydratedDocument<ConnectPaymentExecution> & {
    createdAt: Date;
    updatedAt: Date;
  };

@Schema({
  collection: 'connect_payment_executions',
  timestamps: true,
  versionKey: false,
})
export class ConnectPaymentExecution {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  platformCompanyId!: Types.ObjectId;
  @Prop({
    type: Types.ObjectId,
    ref: 'ProviderCredentials',
    required: true,
    index: true,
  })
  platformConnectionId!: Types.ObjectId;
  @Prop({
    type: Types.ObjectId,
    ref: 'ConnectedPaymentAccount',
    required: true,
    index: true,
  })
  connectedAccountId!: Types.ObjectId;
  @Prop({ required: true, trim: true, index: true }) applicationKey!: string;
  @Prop({ required: true, trim: true, index: true }) externalReference!: string;
  @Prop({ required: true, trim: true }) connectedOrganizationId!: string;
  @Prop({ type: Number, required: true, min: 1 }) amountMinor!: number;
  @Prop({ type: Number, required: true, min: 0 }) applicationFeeMinor!: number;
  @Prop({ type: String, required: true, trim: true, uppercase: true }) currency!: string;
  @Prop({ type: String, required: true, trim: true, unique: true }) idempotencyKey!: string;
  @Prop({ type: String, default: null, index: true }) providerSessionId!: string | null;
  @Prop({ type: String, default: null, index: true }) providerPaymentId!: string | null;
  @Prop({
    required: true,
    enum: ['creating', 'open', 'completed', 'expired', 'failed'],
    default: 'creating',
    index: true,
  })
  status!: string;
  @Prop({ type: String, default: null }) redirectUrl!: string | null;
  @Prop({ type: Date, default: null }) expiresAt!: Date | null;
  @Prop({ type: Date, default: null }) completedAt!: Date | null;
  @Prop({ type: String, default: null }) providerEventId!: string | null;
}

export const ConnectPaymentExecutionSchema = SchemaFactory.createForClass(
  ConnectPaymentExecution,
);
ConnectPaymentExecutionSchema.index(
  { platformConnectionId: 1, applicationKey: 1, externalReference: 1 },
  { unique: true },
);
