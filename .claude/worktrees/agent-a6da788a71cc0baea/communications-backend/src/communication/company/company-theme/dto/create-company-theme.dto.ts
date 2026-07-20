// src/company-theme/dto/create-company-theme.dto.ts
import { IsMongoId } from 'class-validator';
import { CompanyThemeBaseDto } from './company-theme-base.dto';

export class CreateCompanyThemeDto extends CompanyThemeBaseDto {
  @IsMongoId()
  companyId!: string;
}
