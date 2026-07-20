import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

import { CodeProject } from '../../code-projects/schemas/code-project.schema';
import { Platform } from '../../platforms/schemas/platform.schema';

export type ProjectCodePlatformDocument =
  HydratedDocument<ProjectCodePlatform> & {
    createdAt: Date;
    updatedAt: Date;
  };

export enum ProjectCodePlatformStatus {
  Draft = 'draft',
  Published = 'published',
  Suspended = 'suspended',
  Archived = 'archived',
}

export enum ProjectDeliveryMode {
  Download = 'download',
  Webhook = 'webhook',
  Api = 'api',
  Cloud = 'cloud',
  Managed = 'managed',
}

export enum ProjectRuntimeMode {
  None = 'none',
  SignalBased = 'signal_based',
  BotExecution = 'bot_execution',
  CopyTrading = 'copy_trading',
  StrategyRules = 'strategy_rules',
}

@Schema({
  collection: 'project_code_platforms',
  versionKey: false,
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ProjectCodePlatform {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: CodeProject.name,
    required: true,
    index: true,
  })
  codeProjectId!: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: Platform.name,
    required: true,
    index: true,
  })
  platformId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(ProjectDeliveryMode),
    default: ProjectDeliveryMode.Download,
    index: true,
  })
  deliveryMode!: ProjectDeliveryMode;

  @Prop({
    type: String,
    enum: Object.values(ProjectRuntimeMode),
    default: ProjectRuntimeMode.None,
    index: true,
  })
  runtimeMode!: ProjectRuntimeMode;

  @Prop({
    type: String,
    enum: Object.values(ProjectCodePlatformStatus),
    default: ProjectCodePlatformStatus.Draft,
    index: true,
  })
  status!: ProjectCodePlatformStatus;

  @Prop({
    type: Boolean,
    default: true,
    index: true,
  })
  isActive!: boolean;

  @Prop({
    trim: true,
    default: '',
  })
  notes?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ProjectCodePlatformSchema =
  SchemaFactory.createForClass(ProjectCodePlatform);

ProjectCodePlatformSchema.index(
  { codeProjectId: 1, platformId: 1 },
  {
    unique: true,
    name: 'uniq_code_project_platform',
  },
);

ProjectCodePlatformSchema.index({ codeProjectId: 1, isActive: 1 });
ProjectCodePlatformSchema.index({ platformId: 1, isActive: 1 });
ProjectCodePlatformSchema.index({ status: 1, isActive: 1 });

ProjectCodePlatformSchema.virtual('codeProject', {
  ref: CodeProject.name,
  localField: 'codeProjectId',
  foreignField: '_id',
  justOne: true,
});

ProjectCodePlatformSchema.virtual('platform', {
  ref: Platform.name,
  localField: 'platformId',
  foreignField: '_id',
  justOne: true,
});
