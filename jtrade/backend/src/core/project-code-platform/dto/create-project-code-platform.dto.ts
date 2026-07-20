import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';

import {
  ProjectDeliveryMode,
  ProjectRuntimeMode,
} from '../schemas/project-code-platform.schema';

export class CreateProjectCodePlatformDto {
  @IsMongoId()
  codeProjectId!: string;

  @IsMongoId()
  platformId!: string;

  @IsOptional()
  @IsEnum(ProjectDeliveryMode)
  deliveryMode?: ProjectDeliveryMode;

  @IsOptional()
  @IsEnum(ProjectRuntimeMode)
  runtimeMode?: ProjectRuntimeMode;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
