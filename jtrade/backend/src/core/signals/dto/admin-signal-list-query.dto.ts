// src/modules/signals/dto/admin-signal-list-query.dto.ts
import {
  IsOptional,
  IsString,
  IsDateString,
  IsNumberString,
} from 'class-validator';

export class AdminSignalListQueryDto {
  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @IsString()
  timeFrame?: string;

  @IsOptional()
  @IsString()
  indicatorId?: string;

  @IsOptional()
  @IsString()
  adminIndicatorId?: string;

  // 🔥 NUEVO → horas dinámicas
  @IsOptional()
  @IsNumberString()
  lastHours?: string;

  // 🔥 NUEVO → fechas manuales
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
