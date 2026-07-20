import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User> & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ collection: 'users', versionKey: false, timestamps: true })
export class User {
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email!: string;

  // Never returned in API responses — always projected out by UsersService.
  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true, trim: true })
  firstName!: string;

  @Prop({ required: true, trim: true })
  lastName!: string;

  @Prop({ default: false, index: true })
  isEmailVerified!: boolean;

  // SHA-256 hash of the raw token sent via email.
  // Sparse index is declared below via UserSchema.index (no index: true here).
  @Prop({ type: String, default: null })
  emailVerificationToken!: string | null;

  @Prop({ type: Date, default: null })
  emailVerificationTokenExpiresAt!: Date | null;

  // SHA-256 hash of the raw token sent via email.
  @Prop({ type: String, default: null })
  passwordResetToken!: string | null;

  @Prop({ type: Date, default: null })
  passwordResetTokenExpiresAt!: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ emailVerificationToken: 1 }, { sparse: true });
UserSchema.index({ passwordResetToken: 1 }, { sparse: true });
