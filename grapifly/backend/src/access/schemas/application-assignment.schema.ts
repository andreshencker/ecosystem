import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ApplicationAssignmentDocument = HydratedDocument<ApplicationAssignment>;

@Schema({ collection: 'application_assignments', timestamps: true, versionKey: false })
export class ApplicationAssignment {
  @Prop({ required: true, index: true })
  grapiflyUserId!: string;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  applicationKey!: string;

  @Prop({ required: true, enum: ['active', 'suspended', 'revoked'], default: 'active', index: true })
  status!: 'active' | 'suspended' | 'revoked';

  @Prop({ required: true, enum: ['bootstrap', 'admin', 'migration', 'auto'], default: 'admin' })
  source!: 'bootstrap' | 'admin' | 'migration' | 'auto';

  @Prop({ type: Date, default: Date.now })
  grantedAt!: Date;
}

export const ApplicationAssignmentSchema = SchemaFactory.createForClass(ApplicationAssignment);
ApplicationAssignmentSchema.index({ grapiflyUserId: 1, applicationKey: 1 }, { unique: true });
