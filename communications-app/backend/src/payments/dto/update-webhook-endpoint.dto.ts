import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class UpdateWebhookEndpointDto {
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false, protocols: ['https', 'http'] })
  @MaxLength(2000)
  url?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledEvents?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  disabled?: boolean;

  @IsOptional()
  metadata?: Record<string, string>;
}
