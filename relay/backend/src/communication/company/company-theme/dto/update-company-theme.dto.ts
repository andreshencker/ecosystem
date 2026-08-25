// src/company-theme/dto/update-company-theme.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CompanyThemeBaseDto } from './company-theme-base.dto';

export class UpdateCompanyThemeDto extends PartialType(CompanyThemeBaseDto) {}
