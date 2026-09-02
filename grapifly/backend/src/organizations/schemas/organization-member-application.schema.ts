import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrganizationMemberApplicationDocument = HydratedDocument<OrganizationMemberApplication>;
// Not a fixed union anymore — each app declares its own valid roles in its
// catalogue entry (Application.ownerRoles). Validated in OrganizationsService
// against that list, not constrained here.
export type ApplicationMemberRole = string;

@Schema({ collection: 'organization_member_applications', timestamps: true, versionKey: false })
export class OrganizationMemberApplication {
  @Prop({ required: true, index: true })
  organizationId!: string;

  @Prop({ required: true, index: true })
  grapiflyUserId!: string;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  applicationKey!: string;

  @Prop({ required: true, lowercase: true, trim: true, default: 'viewer' })
  role!: ApplicationMemberRole;

  @Prop({ required: true, enum: ['active', 'suspended', 'revoked'], default: 'active' })
  status!: 'active' | 'suspended' | 'revoked';
}

export const OrganizationMemberApplicationSchema = SchemaFactory.createForClass(OrganizationMemberApplication);
OrganizationMemberApplicationSchema.index({ organizationId: 1, grapiflyUserId: 1, applicationKey: 1 }, { unique: true });
