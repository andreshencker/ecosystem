import {
  IsBoolean,
  IsMongoId,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateIndicatorProjectDto {
  @IsMongoId()
  projectCodePlatformId!: string;

  @IsMongoId()
  indicatorId!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @Length(0, 300)
  notes?: string;
}
