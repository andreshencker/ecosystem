// src/company-theme/dto/company-theme-base.dto.ts
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CompanyThemeBaseDto {
  // 🎨 Colors
  @IsString() @IsNotEmpty() primaryColor!: string;
  @IsString() @IsNotEmpty() secondaryColor!: string;
  @IsString() @IsNotEmpty() backgroundColor!: string;
  @IsString() @IsNotEmpty() surfaceColor!: string;
  @IsString() @IsNotEmpty() textColor!: string;
  @IsString() @IsNotEmpty() mutedTextColor!: string;
  @IsString() @IsNotEmpty() borderColor!: string;
  @IsString() @IsNotEmpty() linkColor!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  // 🅰️ Typography
  @IsString() @IsNotEmpty() fontFamily!: string;
  @IsString() @IsNotEmpty() fontSizeBase!: string;

  @Type(() => Number)
  @IsNumber()
  fontWeightNormal!: number;

  @Type(() => Number)
  @IsNumber()
  fontWeightBold!: number;

  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
