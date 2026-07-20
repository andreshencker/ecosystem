// src/channels/provider-credentials/dto/test-smtp-email.dto.ts
import {
  IsEmail,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class TestSmtpEmailDto {
  @IsMongoId()
  companyChannelProviderId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  tag!: string; // ej: "support" | "marketing"

  @IsEmail()
  to!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject!: string;

  @IsString()
  @MinLength(1)
  html!: string;

  // opcional: si quieres forzar un "from" específico (si no, se usa el del credential)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  from?: string;
}
