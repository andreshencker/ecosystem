import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCompanyIntegrationDto {
  @IsString()
  companyId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  integrationKey!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(['development', 'staging', 'production'])
  environment?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;
}
