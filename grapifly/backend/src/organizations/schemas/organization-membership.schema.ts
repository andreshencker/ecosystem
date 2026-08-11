import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrganizationMembershipDocument = HydratedDocument<OrganizationMembership>;

@Schema({ collection: 'organization_memberships', timestamps: true, versionKey: false })
export class OrganizationMembership {
  @Prop({ required: true, unique: true, index: true })
  membershipId!: string;

  @Prop({ required: true, index: true })
  organizationId!: string;

  @Prop({ required: true, index: true })
  grapiflyUserId!: string;

  @Prop({ required: true, enum: ['owner', 'admin', 'member'], default: 'member' })
  role!: 'owner' | 'admin' | 'member';

  @Prop({ required: true, enum: ['active', 'suspended', 'revoked'], default: 'active', index: true })
  status!: 'active' | 'suspended' | 'revoked';
}

export const OrganizationMembershipSchema = SchemaFactory.createForClass(OrganizationMembership);
OrganizationMembershipSchema.index({ organizationId: 1, grapiflyUserId: 1 }, { unique: true });
