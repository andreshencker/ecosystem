import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

import { CompanyProvider } from '../../company-provider/schemas/company-provider.schema';
import { TypeProject } from '../../type-projects/schemas/type-project.schema';

export type CodeProjectDocument = HydratedDocument<CodeProject> & {
  createdAt: Date;
  updatedAt: Date;
};

export enum CodeProjectStatus {
  Draft = 'draft',
  Published = 'published',
  Suspended = 'suspended',
  Archived = 'archived',
}

@Schema({
  collection: 'code_projects',
  versionKey: false,
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CodeProject {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: CompanyProvider.name,
    required: true,
    index: true,
  })
  companyProviderId!: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: TypeProject.name,
    required: true,
    index: true,
  })
  typeProjectId!: Types.ObjectId;

  @Prop({
    required: true,
    index: true,
    lowercase: true,
    trim: true,
  })
  projectKey!: string;

  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    trim: true,
    default: '',
  })
  description?: string;

  @Prop({
    type: String,
    enum: Object.values(CodeProjectStatus),
    default: CodeProjectStatus.Draft,
    index: true,
  })
  status!: CodeProjectStatus;

  @Prop({
    default: true,
    index: true,
  })
  isActive!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export const CodeProjectSchema = SchemaFactory.createForClass(CodeProject);

CodeProjectSchema.index(
  { companyProviderId: 1, projectKey: 1 },
  { unique: true, name: 'uniq_company_project_key' },
);

CodeProjectSchema.index({ companyProviderId: 1, isActive: 1 });
CodeProjectSchema.index({ typeProjectId: 1, isActive: 1 });
CodeProjectSchema.index({ status: 1, isActive: 1 });

CodeProjectSchema.virtual('companyProvider', {
  ref: CompanyProvider.name,
  localField: 'companyProviderId',
  foreignField: '_id',
  justOne: true,
});

CodeProjectSchema.virtual('typeProject', {
  ref: TypeProject.name,
  localField: 'typeProjectId',
  foreignField: '_id',
  justOne: true,
});
