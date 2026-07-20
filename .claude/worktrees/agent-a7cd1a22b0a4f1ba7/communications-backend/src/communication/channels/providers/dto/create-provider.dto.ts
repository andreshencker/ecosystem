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

  @IsMongoId()
  channelId!: string;

  @IsIn(['api_key', 'smtp', 'oauth', 'access_keys'])
  connectionType!: 'api_key' | 'smtp' | 'oauth' | 'access_keys';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
