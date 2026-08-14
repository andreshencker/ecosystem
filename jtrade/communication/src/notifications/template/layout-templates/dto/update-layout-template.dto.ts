// src/layout-templates/dto/update-layout-template.dto.ts
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import type { TemplateType } from '../schemas/layout-template.schema';

export class UpdateLayoutTemplateDto {
  @IsOptional()
  @IsString()
  companyThemeId?: string;

  @IsOptional()
  @IsEnum(['email', 'pdf'])
  templateType?: TemplateType;

  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  html?: string;

  @IsOptional()
  @IsString()
  css?: string;

  @IsOptional()
  @IsArray()
  requiredVariables?: string[];

  @IsOptional()
  @IsArray()
  optionalVariables?: string[];

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
