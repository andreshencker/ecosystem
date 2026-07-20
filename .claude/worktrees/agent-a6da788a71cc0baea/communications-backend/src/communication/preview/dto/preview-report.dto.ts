import { IsObject, IsOptional, IsString } from 'class-validator';

export class PreviewReportDto {
  @IsString()
  layoutTemplateId!: string;

  /**
   * Payload del dominio Reports
   * (sections, meta, etc.)
   */
  @IsObject()
  report!: Record<string, any>;

  /**
   * Data opcional usada dentro del reporte
   */
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
