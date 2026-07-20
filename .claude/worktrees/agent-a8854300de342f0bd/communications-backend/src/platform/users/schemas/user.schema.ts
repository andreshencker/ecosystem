import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// ─── Canonical role and scope types (DEC-008) ────────────────────────────────
// Single definition — imported by auth-context.types.ts, invitation.schema.ts,
// invite-user.dto.ts, and invitation-response.dto.ts.

export type UserRole =
  | 'platform_admin'
  | 'company_owner'
  | 'company_admin'
  | 'operator'
  | 'viewer';

export type UserScope = 'global' | 'company';

// ─── Document type ────────────────────────────────────────────────────────────

export type UserDocument = HydratedDocument<User> & {
  createdAt: Date;
  updatedAt: Date;
};

// ─── Schema ───────────────────────────────────────────────────────────────────

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

  @Prop({ type: String, default: null })
  avatarUrl!: string | null;

  // ── RBAC fields (DEC-008 A1) ─────────────────────────────────────────────

  @Prop({
    type: String,
    required: false,
    enum: ['platform_admin', 'company_owner', 'company_admin', 'operator', 'viewer'],
    index: true,
  })
  role!: UserRole;

  @Prop({
    type: String,
    required: false,
    enum: ['global', 'company'],
  })
  scope!: UserScope;

  /** ObjectId string for all users. platform_admin points to the Grapifly platform company (isPlatformCompany: true). null only during the bootstrap window before the service has run (DEC-008 A3). */
  @Prop({ type: String, default: null, index: true })
  companyId!: string | null;

  /** Denormalised company slug. 'grapifly' for platform_admin; tenant key for company-scoped users. */
  @Prop({ type: String, default: null })
  companyKey!: string | null;

  // ── Status ───────────────────────────────────────────────────────────────

  @Prop({ default: true, index: true })
  isActive!: boolean;

  @Prop({ default: false, index: true })
  isEmailVerified!: boolean;

  /** Set to true for admin-invited users. Enforces password change on first login (DEC-014). */
  @Prop({ default: false })
  mustChangePassword!: boolean;

  /** Timestamp when the temporary password was generated. Null for self-registered users. (DEC-014) */
  @Prop({ type: Date, default: null })
  temporaryPasswordCreatedAt!: Date | null;

  /** Temporary password expiry (72 h after creation). Null for self-registered users. (DEC-014) */
  @Prop({ type: Date, default: null })
  temporaryPasswordExpiresAt!: Date | null;

  // ── Auth tokens (never returned in API responses) ─────────────────────────

  // SHA-256 hash of the raw token sent via email.
  // Sparse index is declared below via UserSchema.index (no index: true here).
  @Prop({ type: String, default: null })
  emailVerificationToken!: string | null;

  @Prop({ type: Date, default: null })
  emailVerificationTokenExpiresAt!: Date | null;

  @Prop({ type: String, default: null })
  passwordResetToken!: string | null;

  @Prop({ type: Date, default: null })
  passwordResetTokenExpiresAt!: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ emailVerificationToken: 1 }, { sparse: true });
UserSchema.index({ passwordResetToken: 1 }, { sparse: true });
