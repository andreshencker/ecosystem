import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type EmailVerificationDocument = EmailVerification & Document;

@Schema({ timestamps: true })
export class EmailVerification {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user: Types.ObjectId;

  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  used: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const EmailVerificationSchema =
  SchemaFactory.createForClass(EmailVerification);

/*
EmailVerificationSchema.index({ token: 1 }, { unique: true });
EmailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
EmailVerificationSchema.index({ user: 1, createdAt: -1 });*/
