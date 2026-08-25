// src/layout-templates/dto/create-layout-template.dto.ts
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import type { TemplateType } from '../schemas/layout-template.schema';

export class CreateLayoutTemplateDto {
  @IsString()
  @IsNotEmpty()
  companyThemeId!: string;

  @IsEnum(['email', 'pdf'])
  templateType!: TemplateType;

  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  html!: string;

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
