import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ConnectedPaymentAccountDocument =
  HydratedDocument<ConnectedPaymentAccount> & {
    createdAt: Date;
    updatedAt: Date;
  };

@Schema({
  collection: 'connected_payment_accounts',
  timestamps: true,
  versionKey: false,
})
export class ConnectedPaymentAccount {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  platformCompanyId!: Types.ObjectId;
  @Prop({
    type: Types.ObjectId,
    ref: 'ProviderCredentials',
    required: true,
    index: true,
  })
  platformConnectionId!: Types.ObjectId;
  @Prop({ required: true, trim: true, index: true })
  connectedOrganizationId!: string;
  @Prop({ required: true, trim: true }) providerKey!: string;
  @Prop({ required: true, trim: true, index: true }) providerAccountId!: string;
  @Prop({ required: true, enum: ['test', 'live'] }) environment!:
    | 'test'
    | 'live';
  @Prop({
    required: true,
    enum: ['pending', 'enabled', 'restricted', 'disabled'],
    default: 'pending',
  })
  status!: string;
  @Prop({ type: Boolean, default: false }) chargesEnabled!: boolean;
  @Prop({ type: Boolean, default: false }) payoutsEnabled!: boolean;
  @Prop({ type: Boolean, default: false }) detailsSubmitted!: boolean;
  @Prop({ type: String, default: null }) country!: string | null;
  @Prop({ type: String, default: null }) defaultCurrency!: string | null;
  @Prop({ type: [String], default: [] }) requirementsCurrentlyDue!: string[];
  @Prop({ type: [String], default: [] }) requirementsEventuallyDue!: string[];
  @Prop({ type: String, default: null }) disabledReason!: string | null;
}

export const ConnectedPaymentAccountSchema = SchemaFactory.createForClass(
  ConnectedPaymentAccount,
);
ConnectedPaymentAccountSchema.index(
  { platformConnectionId: 1, connectedOrganizationId: 1 },
  { unique: true },
);
ConnectedPaymentAccountSchema.index(
  { platformConnectionId: 1, providerAccountId: 1 },
  { unique: true },
);
