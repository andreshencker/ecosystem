import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type UserPlatformDocument = HydratedDocument<UserPlatform>;

export enum UserPlatformStatus {
  Pending = 'pending',
  Connected = 'connected',
  Disconnected = 'disconnected',
  Error = 'error',
}

@Schema({
  timestamps: true,
  collection: 'user_platforms',
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class UserPlatform {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Platform',
    required: true,
    index: true,
  })
  platformId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(UserPlatformStatus),
    default: UserPlatformStatus.Pending,
    index: true,
  })
  status!: UserPlatformStatus;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ type: Boolean, default: false, index: true })
  isDefault!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserPlatformSchema = SchemaFactory.createForClass(UserPlatform);

// Único por (userId, platformId)
UserPlatformSchema.index({ userId: 1, platformId: 1 }, { unique: true });

UserPlatformSchema.virtual('platform', {
  ref: 'Platform',
  localField: 'platformId',
  foreignField: '_id',
  justOne: true,
  options: {
    select: 'name category imageUrl isActive isSupported connectionType',
  },
});
UserPlatformSchema.virtual('user', {
  ref: User.name,
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});