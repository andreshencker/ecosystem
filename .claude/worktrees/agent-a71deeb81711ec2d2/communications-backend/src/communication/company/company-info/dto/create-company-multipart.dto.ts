// src/company-info/dto/create-company-multipart.dto.ts
import { IsBooleanString, IsOptional, IsString } from 'class-validator';

export class CreateCompanyMultipartDto {
  @IsString()
  companyKey!: string;

  @IsString()
  displayName!: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  tagline?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  // ✅ Opción URL directa
  @IsOptional()
  @IsString()
  logoIconUrl?: string;

  @IsOptional()
  @IsString()
  logoFullUrl?: string;

  @IsOptional()
  @IsBooleanString()
  isActive?: string;
}
