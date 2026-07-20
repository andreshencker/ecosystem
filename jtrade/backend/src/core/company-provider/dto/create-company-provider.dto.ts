import { IsEmail, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateCompanyProviderDto {
  @IsString()
  companyName!: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
