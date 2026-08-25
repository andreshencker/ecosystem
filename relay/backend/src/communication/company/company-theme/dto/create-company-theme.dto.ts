// src/company-theme/dto/create-company-theme.dto.ts
import { CompanyThemeBaseDto } from './company-theme-base.dto';

// The tenant is resolved from the Grapifly session. It must never be accepted
// from a browser-controlled request body.
export class CreateCompanyThemeDto extends CompanyThemeBaseDto {}
