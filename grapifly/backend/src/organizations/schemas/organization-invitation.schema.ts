import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrganizationInvitationDocument = HydratedDocument<OrganizationInvitation>;

@Schema({ collection: 'organization_invitations', timestamps: true, versionKey: false })
export class OrganizationInvitation {
  @Prop({ required: true, unique: true, index: true })
  invitationId!: string;

  @Prop({ required: true, index: true })
  organizationId!: string;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email!: string;

  @Prop({ required: true, enum: ['admin', 'member'], default: 'member' })
  role!: 'admin' | 'member';

  @Prop({ type: [String], default: [] })
  applicationKeys!: string[];

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

export const OrganizationInvitationSchema = SchemaFactory.createForClass(OrganizationInvitation);
OrganizationInvitationSchema.index({ organizationId: 1, email: 1, status: 1 });
