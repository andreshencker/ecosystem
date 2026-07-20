import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ChannelToUseDto } from './channel-to-use.dto';

export class CreateDomainCatalogueDto {
  @IsMongoId()
  companyId!: string;

  @IsString()
  @IsNotEmpty()
  domainKey!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsString()
  @IsNotEmpty()
  domainCategory!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChannelToUseDto)
  channelsToUse?: ChannelToUseDto[];
}
