// src/modules/signals/dto/client-signal-list-query.dto.ts
import {
  IsOptional,
  IsString,
  IsDateString,
  IsNumberString,
} from 'class-validator';

export class ClientSignalListQueryDto {
  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @IsString()
  timeFrame?: string;

  @IsOptional()
  @IsString()
  indicatorId?: string;

  // 🔥 NUEVO
  @IsOptional()
  @IsNumberString()
  lastHours?: string;

  // 🔥 NUEVO
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
