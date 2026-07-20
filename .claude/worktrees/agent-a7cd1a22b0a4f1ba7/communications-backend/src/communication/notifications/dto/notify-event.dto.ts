// src/notifications/dto/notify-event.dto.ts
import { IsEmail, IsObject, IsOptional, IsString } from 'class-validator';

export class NotifyEventDto {
  @IsString()
  companyId!: string;

  @IsString()
  event!: string; // eventKey

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;
}
