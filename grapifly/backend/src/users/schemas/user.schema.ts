import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GrapiflyUserDocument = HydratedDocument<GrapiflyUser>;

@Schema({ collection: 'grapifly_users', timestamps: true, versionKey: false })
export class GrapiflyUser {
  @Prop({ required: true, unique: true, index: true })
  grapiflyUserId!: string;

  @Prop({ required: true, enum: ['google'], index: true })
  provider!: 'google';

  @Prop({ required: true })
  providerSubject!: string;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email!: string;

  @Prop({ default: true })
  emailVerified!: boolean;

  @Prop({ required: true, trim: true })
  displayName!: string;

  @Prop({ default: null })
  avatarUrl!: string | null;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: Date, default: Date.now })
  lastLoginAt!: Date;
}

export const GrapiflyUserSchema = SchemaFactory.createForClass(GrapiflyUser);
GrapiflyUserSchema.index({ provider: 1, providerSubject: 1 }, { unique: true });
