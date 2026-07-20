// src/files/generator/dto/generate-file.dto.ts
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import type { FileFormat } from '../utils/mime.util';

export class GenerateFileDto {
  @IsIn(['pdf', 'xlsx', 'csv'])
  format!: FileFormat;

  @IsString()
  filename!: string;

  /**
   * Payload del archivo (no del dominio):
   * - PDF: { html: string }
   * - CSV: { table: { columns, rows }, mode?: 'clean'|'full' }
   * - XLSX:{ meta?, table, notes?, totals? }
   */
  @IsObject()
  payload!: Record<string, any>;

  /**
   * Opcional: metadata auxiliar si algún caller lo necesita.
   * Generator no lo usa para "branding/layout".
   */
  @IsOptional()
  @IsObject()
  meta?: Record<string, any>;
}
