import { ArrayMaxSize, IsArray, IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSymbolDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  symbol!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  aliases?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
