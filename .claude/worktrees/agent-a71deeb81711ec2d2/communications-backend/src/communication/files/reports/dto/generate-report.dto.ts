// src/files/reports/dto/generate-report.dto.ts
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class GenerateReportDto {
  @IsString()
  companyId!: string; // ✅ runtime SI conoce companyId

  @IsOptional()
  @IsString()
  layoutKey?: string; // (puede quedar, pero si vas full default, ni lo uses)

  @IsString()
  filename!: string;

  @IsOptional()
  @IsIn(['pdf'])
  format?: 'pdf';

  @IsObject()
  report!: Record<string, any>;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
