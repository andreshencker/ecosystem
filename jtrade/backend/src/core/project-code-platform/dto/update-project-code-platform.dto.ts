import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';

import {
  ProjectCodePlatformStatus,
  ProjectDeliveryMode,
  ProjectRuntimeMode,
} from '../schemas/project-code-platform.schema';

export class UpdateProjectCodePlatformDto {
  @IsOptional()
  @IsMongoId()
  platformId?: string;

  @IsOptional()
  @IsEnum(ProjectDeliveryMode)
  deliveryMode?: ProjectDeliveryMode;

  @IsOptional()
  @IsEnum(ProjectRuntimeMode)
  runtimeMode?: ProjectRuntimeMode;

  @IsOptional()
  @IsEnum(ProjectCodePlatformStatus)
  status?: ProjectCodePlatformStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
