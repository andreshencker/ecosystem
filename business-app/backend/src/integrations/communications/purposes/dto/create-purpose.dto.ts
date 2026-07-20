import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChannelToUseInputDto {
  @ApiProperty({ enum: ['email', 'sms'] })
  @IsEnum(['email', 'sms'])
  channel!: 'email' | 'sms';

  @ApiProperty({ description: 'ProviderCredentials ObjectId from Communications' })
  @IsMongoId()
  providerCredentialsId!: string;
}

export class CreatePurposeDto {
  @ApiProperty({ example: 'invoicing', description: 'Unique key for this purpose (lowercase, immutable after creation)' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  domainKey!: string;

  @ApiProperty({ example: 'Invoicing', description: 'User-facing display name' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  displayName!: string;

  @ApiProperty({ example: 'billing', description: 'Category grouping (e.g. billing, support, marketing)' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  domainCategory!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [ChannelToUseInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChannelToUseInputDto)
  channelsToUse?: ChannelToUseInputDto[];
}
