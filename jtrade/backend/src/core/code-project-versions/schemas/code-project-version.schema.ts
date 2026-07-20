import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

import { ProjectCodePlatform } from '../../project-code-platform/schemas/project-code-platform.schema';
import { CodeProject } from '../../code-projects/schemas/code-project.schema';
import { CompanyProvider } from '../../company-provider/schemas/company-provider.schema';
import { Platform } from '../../platforms/schemas/platform.schema';

export type CodeProjectVersionDocument =
  HydratedDocument<CodeProjectVersion> & {
    createdAt: Date;
    updatedAt: Date;
  };

@Schema({
  collection: 'code_project_versions',
  versionKey: false,
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CodeProjectVersion {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: ProjectCodePlatform.name,
    required: true,
    index: true,
  })
  projectCodePlatformId!: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: CodeProject.name,
    required: true,
    index: true,
  })
  codeProjectId!: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: CompanyProvider.name,
    required: true,
    index: true,
  })
  companyProviderId!: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: Platform.name,
    required: true,
    index: true,
  })
  platformId!: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
    lowercase: true,
    index: true,
  })
  projectKey!: string;

  @Prop({
    required: true,
    trim: true,
    index: true,
  })
  version!: string;

  @Prop({
    required: true,
    trim: true,
  })
  fileName!: string;

  @Prop({
    type: String,
    trim: true,
    default: '',
  })
  originalFileName?: string;

  @Prop({
    required: true,
    trim: true,
    lowercase: true,
  })
  extension!: string;

  @Prop({
    required: true,
    trim: true,
    index: true,
  })
  fileKey!: string;

  @Prop({
    type: Number,
    default: 0,
  })
  size!: number;

  @Prop({
    type: String,
    trim: true,
    default: 'application/octet-stream',
  })
  contentType!: string;

  @Prop({
    type: String,
    trim: true,
    default: '',
  })
  comments?: string;

  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  isCurrentVersion!: boolean;

  @Prop({
    type: Boolean,
    default: true,
    index: true,
  })
  isActive!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export const CodeProjectVersionSchema =
  SchemaFactory.createForClass(CodeProjectVersion);

CodeProjectVersionSchema.index(
  { projectCodePlatformId: 1, version: 1 },
  {
    unique: true,
    name: 'uniq_project_code_platform_version',
  },
);

CodeProjectVersionSchema.index(
  { projectCodePlatformId: 1, isCurrentVersion: 1 },
  {
    unique: true,
    partialFilterExpression: { isCurrentVersion: true },
    name: 'uniq_current_version_per_project_code_platform',
  },
);

CodeProjectVersionSchema.index({
  companyProviderId: 1,
  createdAt: -1,
});

CodeProjectVersionSchema.index({
  codeProjectId: 1,
  platformId: 1,
  createdAt: -1,
});

CodeProjectVersionSchema.index({
  projectKey: 1,
  platformId: 1,
  createdAt: -1,
});

CodeProjectVersionSchema.virtual('projectCodePlatform', {
  ref: ProjectCodePlatform.name,
  localField: 'projectCodePlatformId',
  foreignField: '_id',
  justOne: true,
});

CodeProjectVersionSchema.virtual('codeProject', {
  ref: CodeProject.name,
  localField: 'codeProjectId',
  foreignField: '_id',
  justOne: true,
});

CodeProjectVersionSchema.virtual('companyProvider', {
  ref: CompanyProvider.name,
  localField: 'companyProviderId',
  foreignField: '_id',
  justOne: true,
});

CodeProjectVersionSchema.virtual('platform', {
  ref: Platform.name,
  localField: 'platformId',
  foreignField: '_id',
  justOne: true,
});
