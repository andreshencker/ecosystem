import {
  IsBoolean,
  IsMongoId,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateIndicatorDto {
  @IsMongoId()
  companyProviderId!: string;

  @IsString()
  @Length(2, 50)
  name!: string;

  @IsString()
  @Length(2, 50)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'key must be lowercase and can include hyphens (e.g. blade, blade-v2)',
  })
  key!: string;

  @IsOptional()
  @IsString()
  @Length(0, 300)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
