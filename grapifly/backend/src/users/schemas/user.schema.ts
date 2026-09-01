import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GrapiflyUserDocument = HydratedDocument<GrapiflyUser>;
export type GrapiflyUserKind = 'client' | 'internal' | 'provider';

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

  @Prop({ type: String, default: null })
  avatarUrl!: string | null;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: Date, default: Date.now })
  lastLoginAt!: Date;

  /**
   * Which of the three ecosystem entry-doors this account came through. Set
   * once, at creation, and not expected to change afterward:
   *   client   — signed in directly with Google (self-serve, the default).
   *   internal — created by accepting an ecosystem-admin invitation.
   *   provider — created by submitting the app-provider registration form.
   * This never carries role/permission detail — those live in their own
   * tables (PlatformAdmin for internal, OrganizationMemberApplication for
   * client). It only answers "what kind of account is this."
   */
  @Prop({ required: true, enum: ['client', 'internal', 'provider'], default: 'client' })
  tipo!: GrapiflyUserKind;
}

export const GrapiflyUserSchema = SchemaFactory.createForClass(GrapiflyUser);
GrapiflyUserSchema.index({ provider: 1, providerSubject: 1 }, { unique: true });
