import {
  IsArray,
  IsBoolean,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';

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

  /**
   * One or more channel IDs this provider belongs to.
   * Accepts a single MongoId string or an array of MongoId strings.
   */
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value) ? (value as string[]) : [value as string],
  )
  @IsArray()
  @IsMongoId({ each: true })
  channelId!: string | string[];

  @IsIn(['api_key', 'smtp', 'oauth', 'access_keys', 'token', 'app_password'])
  connectionType!:
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
