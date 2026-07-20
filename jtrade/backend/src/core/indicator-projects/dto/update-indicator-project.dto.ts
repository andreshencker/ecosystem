import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class UpdateIndicatorProjectDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @Length(0, 300)
  notes?: string;
}
