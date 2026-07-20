import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  ADMIN = 'admin',
  CLIENT = 'client',
  PROVIDER = 'provider',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  firstName: string;

  @Prop()
  middleName?: string;

  @Prop({ required: true })
  lastName: string;

  @Prop()
  secondLastName?: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ trim: true, unique: true, sparse: true })
  phone?: string;

  // Guarda el HASH
  @Prop({ required: true })
  passwordHash: string;

  @Prop({
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.CLIENT,
  })
  role: UserRole;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ trim: true })
  avatarUrl?: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop()
  emailVerifiedAt?: Date;

  @Prop({ default: false })
  mustChangePassword: boolean;

  @Prop()
  mustChangePasswordAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
