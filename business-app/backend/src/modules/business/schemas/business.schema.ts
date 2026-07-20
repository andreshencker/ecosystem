import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BusinessDocument = HydratedDocument<Business>;

@Schema({
  collection: 'businesses',
  timestamps: true,
  versionKey: false,
})
export class Business {
  @Prop({
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
    index: true,
  })
  businessKey!: string;

  @Prop({ required: true, trim: true })
  businessName!: string;

  /** ObjectId string of the business_owner user. Set atomically on company creation (DEC-009 Rev-2). */
  @Prop({ type: String, default: null })
  ownerUserId!: string | null;

  /** Australian Business Number — 11 digits, stored as string. */
  @Prop({ type: String, default: null })
  abn!: string | null;

  /** Bank account for receiving deposits (BSB + account number). */
  @Prop({
    type: {
      bsb: { type: String, default: null },
      accountNumber: { type: String, default: null },
    },
    _id: false,
    default: () => ({ bsb: null, accountNumber: null }),
  })
  depositAccount!: { bsb: string | null; accountNumber: string | null };

  @Prop({ type: String, default: 'AUD', trim: true, uppercase: true })
  defaultCurrency!: string;

  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;

  /** Marks the single Invoice App modules operator company. Bootstrap-only — never set by tenant APIs. */
  @Prop({ type: Boolean, default: false })
  isPlatformCompany!: boolean;
}

export const BusinessSchema = SchemaFactory.createForClass(Business);

// Unique partial index: at most one document may have isPlatformCompany === true.
BusinessSchema.index(
  { isPlatformCompany: 1 },
  { unique: true, partialFilterExpression: { isPlatformCompany: true } },
);
