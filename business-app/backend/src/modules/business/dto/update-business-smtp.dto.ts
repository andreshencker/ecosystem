import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateBusinessSmtpDto {
  @IsOptional()
  @IsEmail()
  fromEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fromName?: string;

  /** SMTP host — encrypted at rest. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(253)
  host?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsOptional()
  @IsBoolean()
  secure?: boolean;

  /** SMTP username — encrypted at rest. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  user?: string;

  /** SMTP password — encrypted at rest. Never returned in responses. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  pass?: string;
}
