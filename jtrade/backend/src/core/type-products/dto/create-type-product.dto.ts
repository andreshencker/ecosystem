import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateTypeProductDto {
  @IsString() @MinLength(2) @MaxLength(40)
  key!: string;

  @IsString() @MinLength(2) @MaxLength(60)
  name!: string;

  @IsOptional() @IsString() @MaxLength(160)
  shortDescription?: string;

  @IsOptional() @IsString() @MaxLength(4000)
  description?: string;

  @IsOptional() @IsString() @MaxLength(500)
  iconUrl?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsInt() @Min(0)
  displayOrder?: number;
}
