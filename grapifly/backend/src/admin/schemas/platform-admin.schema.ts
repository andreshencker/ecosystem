import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PlatformAdminDocument = HydratedDocument<PlatformAdmin>;

@Schema({ collection: 'platform_admins', timestamps: true, versionKey: false })
export class PlatformAdmin {
  @Prop({ required: true, unique: true, index: true })
  grapiflyUserId!: string;

  @Prop({ required: true, lowercase: true, trim: true, unique: true, index: true })
  email!: string;

  @Prop({ required: true, enum: ['ecosystem_super_admin'], index: true })
  role!: 'ecosystem_super_admin';

  @Prop({ required: true, enum: ['active', 'suspended'], default: 'active', index: true })
  status!: 'active' | 'suspended';
}

export const PlatformAdminSchema = SchemaFactory.createForClass(PlatformAdmin);
