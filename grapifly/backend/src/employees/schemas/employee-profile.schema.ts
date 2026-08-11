import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EmployeeProfileDocument = HydratedDocument<EmployeeProfile>;
export type EmployeeRole = 'ecosystem_super_admin';

@Schema({ collection: 'employee_profiles', timestamps: true, versionKey: false })
export class EmployeeProfile {
  @Prop({ required: true, unique: true, index: true })
  grapiflyUserId!: string;

  @Prop({ required: true, lowercase: true, trim: true, unique: true, index: true })
  email!: string;

  @Prop({ required: true, enum: ['ecosystem_super_admin'], index: true })
  role!: EmployeeRole;

  @Prop({ required: true, enum: ['active', 'suspended'], default: 'active', index: true })
  status!: 'active' | 'suspended';

  @Prop({ default: 'Platform' })
  department!: string;

  @Prop({ default: 'Ecosystem Super Admin' })
  title!: string;
}

export const EmployeeProfileSchema = SchemaFactory.createForClass(EmployeeProfile);
