import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';

export type PaymentMethodConfigDocument =
  HydratedDocument<PaymentMethodConfig>;

/**
 * The admin's decision about which of Relay's payment methods jtrade offers,
 * and the method-specific settings jtrade needs on top (allowed countries,
 * platform fee, ...). One row per method. Only the admin writes this.
 *
 * `settings` is an open object — each method folder (`stripe/`, `coingate/`)
 * declares its shape and validates it.
 */
@Schema({
  collection: 'payment_method_config',
  timestamps: true,
  versionKey: false,
})
export class PaymentMethodConfig {
  /** Matches Relay's provider key. */
  @Prop({ required: true, trim: true, lowercase: true, unique: true })
  method!: string;

  /** Offered to providers. */
  @Prop({ type: Boolean, default: false })
  enabled!: boolean;

  /** The mandatory base method — exactly one enabled row should be true. */
  @Prop({ type: Boolean, default: false })
  isRequired!: boolean;

  /** What the provider sees. Defaults from Relay's catalogue. */
  @Prop({ type: String, default: '' })
  displayName!: string;

  @Prop({ type: Number, default: 0 })
  displayOrder!: number;

  /** Relay payment connection that backs this method (ecosystem credentials). */
  @Prop({ type: String, default: null })
  relayConnectionId!: string | null;

  /** Method-specific settings — validated by the method folder, not here. */
  @Prop({ type: SchemaTypes.Mixed, default: {} })
  settings!: Record<string, unknown>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PaymentMethodConfigSchema =
  SchemaFactory.createForClass(PaymentMethodConfig);
