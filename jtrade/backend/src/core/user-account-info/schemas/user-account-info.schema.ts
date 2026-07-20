import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

import { UserProjectPlatform } from '../../user-project-platform/schemas/user-project-platform.schema';
import { IndicatorProject } from '../../indicator-projects/schemas/indicator-project.schema';

export type UserAccountInfoDocument = HydratedDocument<UserAccountInfo>;

@Schema({
  timestamps: true,
  collection: 'user_account_info',
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class UserAccountInfo {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: UserProjectPlatform.name,
    required: true,
    index: true,
  })
  userProjectPlatformId!: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: IndicatorProject.name,
    required: false,
    default: null,
    index: true,
  })
  indicatorProjectId?: Types.ObjectId | null;

  @Prop({
    type: String,
    default: null,
    trim: true,
  })
  accountRef?: string | null;

  @Prop({
    type: String,
    default: null,
    trim: true,
  })
  accountLabel?: string | null;

  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  canTrade!: boolean;

  @Prop({
    type: Boolean,
    default: false,
  })
  useDrawdownLimit!: boolean;

  @Prop({
    type: Boolean,
    default: false,
  })
  useProfitLimit!: boolean;

  @Prop({
    type: Number,
    required: true,
    default: 0,
  })
  maxDrawdownPercent!: number;

  @Prop({
    type: Number,
    required: true,
    default: 0,
  })
  maxProfitPercent!: number;

  @Prop({
    type: Boolean,
    default: true,
    index: true,
  })
  isActive!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserAccountInfoSchema =
  SchemaFactory.createForClass(UserAccountInfo);

UserAccountInfoSchema.index(
  {
    userProjectPlatformId: 1,
    indicatorProjectId: 1,
    accountRef: 1,
  },
  {
    unique: true,
    name: 'uniq_account_info_indicator_ref',
    partialFilterExpression: {
      indicatorProjectId: { $type: 'objectId' },
      accountRef: { $type: 'string' },
    },
  },
);

UserAccountInfoSchema.index(
  {
    userProjectPlatformId: 1,
    indicatorProjectId: 1,
  },
  {
    unique: true,
    name: 'uniq_account_info_indicator_null_ref',
    partialFilterExpression: {
      indicatorProjectId: { $type: 'objectId' },
      accountRef: null,
    },
  },
);

UserAccountInfoSchema.index(
  {
    userProjectPlatformId: 1,
    accountRef: 1,
  },
  {
    unique: true,
    name: 'uniq_account_info_bot_ref',
    partialFilterExpression: {
      indicatorProjectId: null,
      accountRef: { $type: 'string' },
    },
  },
);

UserAccountInfoSchema.index(
  {
    userProjectPlatformId: 1,
  },
  {
    unique: true,
    name: 'uniq_account_info_bot_null_ref',
    partialFilterExpression: {
      indicatorProjectId: null,
      accountRef: null,
    },
  },
);

UserAccountInfoSchema.virtual('userProjectPlatform', {
  ref: UserProjectPlatform.name,
  localField: 'userProjectPlatformId',
  foreignField: '_id',
  justOne: true,
});

UserAccountInfoSchema.virtual('indicatorProject', {
  ref: IndicatorProject.name,
  localField: 'indicatorProjectId',
  foreignField: '_id',
  justOne: true,
});
