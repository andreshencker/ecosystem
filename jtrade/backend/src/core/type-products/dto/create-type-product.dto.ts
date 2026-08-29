import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateTypeProductDto {
  @IsString()
  key!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
