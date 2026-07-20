import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { UserRole } from '../../users/schemas/user.schema';

/**
 * pending_delivery — user created, notification not delivered (credentials not configured or delivery failed). DEC-013.
 * pending          — user created, invitation email delivered, awaiting first login.
 * accepted         — user completed first-login password change. (Future: set on PATCH /users/me/password when mustChangePassword was true.)
 * expired          — invitation expired before use.
 * cancelled        — admin cancelled.
 */
export type InvitationStatus =
  'pending' | 'pending_delivery' | 'accepted' | 'expired' | 'cancelled';

/**
 * Scope of the invitation in terms of who issued it.
 *
 * 'modules' — issued by platform_admin (platform_admin → platform_admin via POST /users/invite).
 * 'company'  — issued within a company context:
 *              - platform_admin → business_owner via company self-registration
 *              - business_owner/admin → business_admin/accountant/staff/viewer via POST /users/invite
 */
export type InvitationScope = 'platform' | 'company';

export type InvitationDocument = HydratedDocument<Invitation> & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ collection: 'invitations', timestamps: true, versionKey: false })
export class Invitation {
  @Prop({ required: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  firstName!: string;

  @Prop({ required: true })
  lastName!: string;

  /**
   * Role assigned to the invited user. All five roles appear in this field because
   * the invitation record is also created by POST /companies/with-owner for business_owner.
   * POST /users/invite enforces INVITE_HIERARCHY and never produces business_owner invitations.
   */
  @Prop({
    type: String,
    required: true,
    enum: [
      'platform_admin',
      'business_owner',
      'business_admin',
      'accountant',
      'staff',
      'viewer',
    ],
  })
  role!: UserRole;

  /** Present for company-scoped target roles; null for platform_admin invites. */
  @Prop({ type: String, default: null })
  companyId!: string | null;

  @Prop({ type: String, default: null })
  businessKey!: string | null;

  @Prop({ required: true })
  tokenHash!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({
    type: String,
    enum: ['pending', 'pending_delivery', 'accepted', 'expired', 'cancelled'],
    default: 'pending_delivery',
  })
  status!: InvitationStatus;

  /** ObjectId string of the user created by this invitation (DEC-013 direct-creation flow). */
  @Prop({ type: String, default: null })
  userId!: string | null;

  @Prop({ type: String, default: null })
  invitedByUserId!: string | null;

  /**
   * Scope of the invitation context.
   * 'modules' → issued by platform_admin for platform_admin or business_owner.
   * 'company'  → issued by business_owner/admin for internal company roles.
   */
  @Prop({
    type: String,
    required: true,
    enum: ['platform', 'company'],
  })
  invitationScope!: InvitationScope;

  /**
   * Which company's credentials the Notification Engine uses to deliver the invitation email.
   * All delivery goes through NotificationService.notifyEvent() — there is no PlatformMailService
   * fallback for invitations (DEC-013 Rev-1, DEC-014 Rev-1).
   *
   * 'modules' → use modules company (Grapifly) credentials.
   * 'company'  → use the target user's assigned company credentials.
   */
  @Prop({
    type: String,
    required: true,
    enum: ['platform', 'company'],
  })
  senderCredentialScope!: InvitationScope;
}

export const InvitationSchema = SchemaFactory.createForClass(Invitation);
InvitationSchema.index({ tokenHash: 1 }, { unique: true });
InvitationSchema.index({ email: 1 });
InvitationSchema.index({ companyId: 1, status: 1 });
InvitationSchema.index({ invitationScope: 1, status: 1 });
