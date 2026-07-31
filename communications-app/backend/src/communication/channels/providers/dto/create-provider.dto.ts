import {
  IsBoolean,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateProviderDto {
  @IsString()
  @IsNotEmpty()
  providerKey!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsMongoId()
  channelId!: string;

  @IsIn(['api_key', 'smtp', 'oauth', 'access_keys', 'token'])
  connectionType!: 'api_key' | 'smtp' | 'oauth' | 'access_keys' | 'token';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
