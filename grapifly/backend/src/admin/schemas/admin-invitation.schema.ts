import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AdminInvitationDocument = HydratedDocument<AdminInvitation>;

/**
 * Invitation into the ecosystem's internal (admin/staff) world — same shape
 * and token mechanics as OrganizationInvitation, but scoped to the whole
 * ecosystem instead of one organization (an admin doesn't belong to anyone's
 * organization). Only an active 'ecosystem_super_admin' can create these
 * (see PlatformAdminService.invite).
 */
@Schema({ collection: 'admin_invitations', timestamps: true, versionKey: false })
export class AdminInvitation {
  @Prop({ required: true, unique: true, index: true })
  invitationId!: string;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email!: string;

  @Prop({ required: true, trim: true })
  level!: string;

  @Prop({ required: true, unique: true, select: false })
  tokenHash!: string;

  @Prop({ required: true })
  invitedBy!: string;

  @Prop({ required: true, enum: ['pending', 'accepted', 'cancelled', 'expired'], default: 'pending', index: true })
  status!: 'pending' | 'accepted' | 'cancelled' | 'expired';

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null })
  acceptedAt!: Date | null;
}

export const AdminInvitationSchema = SchemaFactory.createForClass(AdminInvitation);
AdminInvitationSchema.index({ email: 1, status: 1 });
