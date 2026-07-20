import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCodeProjectVersionDto {
  @IsMongoId()
  projectCodePlatformId!: string;

  @IsString()
  @IsNotEmpty()
  version!: string;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  isCurrentVersion?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  isActive?: boolean;
}
