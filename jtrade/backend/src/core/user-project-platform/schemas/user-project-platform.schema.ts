import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

import { User } from '../../users/schemas/user.schema';
import { ProjectCodePlatform } from '../../project-code-platform/schemas/project-code-platform.schema';

export type UserProjectPlatformDocument =
  HydratedDocument<UserProjectPlatform> & {
    createdAt: Date;
    updatedAt: Date;
  };

@Schema({
  collection: 'user_project_platforms',
  versionKey: false,
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class UserProjectPlatform {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: ProjectCodePlatform.name,
    required: true,
    index: true,
  })
  projectCodePlatformId!: Types.ObjectId;

  @Prop({
    type: Boolean,
    default: true,
    index: true,
  })
  isActive!: boolean;

  @Prop({
    type: Date,
    default: Date.now,
    index: true,
  })
  subscribedAt!: Date;

  @Prop({
    type: Date,
    default: null,
  })
  lastDownloadAt?: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const UserProjectPlatformSchema =
  SchemaFactory.createForClass(UserProjectPlatform);

UserProjectPlatformSchema.index(
  { userId: 1, projectCodePlatformId: 1 },
  {
    unique: true,
    name: 'uniq_user_project_platform',
  },
);

UserProjectPlatformSchema.index({
  userId: 1,
  isActive: 1,
  createdAt: -1,
});

UserProjectPlatformSchema.virtual('user', {
  ref: User.name,
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

UserProjectPlatformSchema.virtual('projectCodePlatform', {
  ref: ProjectCodePlatform.name,
  localField: 'projectCodePlatformId',
  foreignField: '_id',
  justOne: true,
});
