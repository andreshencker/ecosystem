import { IsBoolean, IsMongoId, IsOptional, IsString } from 'class-validator';

export class CreateCodeProjectDto {
  @IsMongoId()
  typeProjectId!: string;

  @IsString()
  projectKey!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
