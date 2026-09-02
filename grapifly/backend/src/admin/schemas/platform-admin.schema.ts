import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PlatformAdminDocument = HydratedDocument<PlatformAdmin>;

@Schema({ collection: 'platform_admins', timestamps: true, versionKey: false })
export class PlatformAdmin {
  @Prop({ required: true, unique: true, index: true })
  grapiflyUserId!: string;

  @Prop({ required: true, lowercase: true, trim: true, unique: true, index: true })
  email!: string;

  /**
   * Admin level. Not a fixed enum — the ecosystem's admin levels are global
   * (shared across every app, unlike per-app owner/provider roles) and grow
   * over time via invitations (see AdminInvitation), so the valid set of
   * levels is enforced in code (AdminLevels), not the DB schema.
   */
  @Prop({ required: true, trim: true, index: true })
  role!: string;

  @Prop({ required: true, enum: ['active', 'suspended'], default: 'active', index: true })
  status!: 'active' | 'suspended';
}

export const PlatformAdminSchema = SchemaFactory.createForClass(PlatformAdmin);
