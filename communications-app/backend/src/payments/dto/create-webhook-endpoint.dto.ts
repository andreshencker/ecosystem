import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateWebhookEndpointDto {
  @IsString()
  @IsUrl({ require_tld: false, protocols: ['https', 'http'] })
  @MaxLength(2000)
  url!: string;

  @IsArray()
  @IsString({ each: true })
  enabledEvents!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  connect?: boolean;

  @IsOptional()
  metadata?: Record<string, string>;
}
