import {
  IsArray,
  IsBoolean,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';

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

  /**
   * Replace the channel assignment(s) for this provider.
   * Accepts a single MongoId string or an array of MongoId strings.
   */
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @IsMongoId({ each: true })
  channelId?: string | string[];

  @IsOptional()
  @IsIn(['api_key', 'smtp', 'oauth', 'access_keys', 'token', 'app_password'])
  connectionType?:
    | 'api_key'
    | 'smtp'
    | 'oauth'
    | 'access_keys'
    | 'token'
    | 'app_password';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
