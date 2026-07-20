import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { ConnectionType, PlatformCategory } from '../schemas/platform.schema';

export class CreatePlatformDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(PlatformCategory)
  category: PlatformCategory;

  @IsEnum(ConnectionType, {
    message: 'connectionType must be either apikey or oauth',
  })
  connectionType: ConnectionType;

  @IsOptional()
  @IsString()
  @IsUrl(
    { require_protocol: true },
    { message: 'imageUrl must be a valid URL with protocol' },
  )
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isSupported?: boolean;
}
