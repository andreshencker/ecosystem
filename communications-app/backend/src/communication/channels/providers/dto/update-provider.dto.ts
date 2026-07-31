import {
  IsBoolean,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateProviderDto {
  @IsOptional()
  @IsString()
  providerKey?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsMongoId()
  channelId?: string;

  @IsOptional()
  @IsIn(['api_key', 'smtp', 'oauth', 'access_keys', 'token'])
  connectionType?: 'api_key' | 'smtp' | 'oauth' | 'access_keys' | 'token';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
