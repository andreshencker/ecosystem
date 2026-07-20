import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';

import { CodeProjectStatus } from '../schemas/code-project.schema';

export class UpdateCodeProjectDto {
  @IsOptional()
  @IsMongoId()
  typeProjectId?: string;

  @IsOptional()
  @IsString()
  projectKey?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CodeProjectStatus)
  status?: CodeProjectStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
