import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProviderPaymentDocument = HydratedDocument<ProviderPayment>;

/** Lifecycle of one payment method for one provider. `sin empezar` = no row. */
export type ProviderPaymentStatus = 'pending' | 'complete' | 'restricted';

/**
 * The registry of a provider's configured payment methods — one row per
 * (provider organization, method). Created the moment onboarding starts and
 * updated as the provider progresses. This table is the single source jtrade
 * reads to answer "does this provider have a working payment method?".
 *
 * It never holds credentials. `relayConnectionId` + `relayAccountId` are the
 * references jtrade passes back to Relay's payment window for every later call.
 * All Stripe/Connect plumbing lives in Relay.
 */
@Schema({ collection: 'provider_payments', timestamps: true, versionKey: false })
export class ProviderPayment {
  /** The provider's Grapifly organization id — from the JWT, never the body. */
  @Prop({ required: true, trim: true, index: true })
  providerOrganizationId!: string;

  /** `stripe` | `coingate` | `paypal` | ... — matches Relay's provider catalogue. */
  @Prop({ required: true, trim: true, lowercase: true })
  method!: string;

  /** Relay payment connection used (the ecosystem's credentials). */
  @Prop({ required: true, trim: true })
  relayConnectionId!: string;

  /** Relay's connected-account record id — the operational handle for later calls. */
  @Prop({ required: true, trim: true })
  relayAccountId!: string;

  /** Provider-side account id at the gateway (e.g. Stripe `acct_...`). Display only. */
  @Prop({ type: String, default: null })
  providerAccountId!: string | null;

  @Prop({
    required: true,
    enum: ['pending', 'complete', 'restricted'],
    default: 'pending',
    index: true,
  })
  status!: ProviderPaymentStatus;

  /** What the gateway still needs / why it is restricted. Mirrors Relay, display only. */
  @Prop({ type: [String], default: [] })
  requirementsDue!: string[];

  @Prop({ type: String, default: null })
  disabledReason!: string | null;

  /** true for the mandatory base method (Stripe). */
  @Prop({ type: Boolean, default: false })
  isBase!: boolean;

  /** Last time the status was refreshed from Relay. */
  @Prop({ type: Date, default: null })
  lastCheckedAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ProviderPaymentSchema = SchemaFactory.createForClass(ProviderPayment);

// One row per method per provider.
ProviderPaymentSchema.index(
  { providerOrganizationId: 1, method: 1 },
  { unique: true },
);
