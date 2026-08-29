import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PendingSignupDocument = HydratedDocument<PendingSignup>;

@Schema({ collection: 'pending_signups', timestamps: true, versionKey: false })
export class PendingSignup {
  @Prop({ required: true, unique: true, index: true })
  tokenHash!: string;

  @Prop({ required: true, index: true })
  appKey!: string;

  @Prop({ required: true, enum: ['google'] })
  provider!: 'google';

  @Prop({ required: true })
  providerSubject!: string;

  @Prop({ required: true })
  email!: string;

  @Prop({ required: true })
  emailVerified!: boolean;

  @Prop({ required: true })
  displayName!: string;

  @Prop({ type: String, default: null })
  avatarUrl!: string | null;

  @Prop({ type: String, default: null })
  organizationId!: string | null;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null })
  consumedAt!: Date | null;
}

export const PendingSignupSchema = SchemaFactory.createForClass(PendingSignup);
PendingSignupSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
