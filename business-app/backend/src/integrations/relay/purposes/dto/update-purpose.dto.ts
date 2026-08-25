import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelToUseInputDto } from './create-purpose.dto';

export class UpdatePurposeDto {
  @ApiPropertyOptional({ example: 'Invoicing' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  displayName?: string;

  @ApiPropertyOptional({ example: 'billing' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  domainCategory?: string;

  @ApiPropertyOptional()
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
