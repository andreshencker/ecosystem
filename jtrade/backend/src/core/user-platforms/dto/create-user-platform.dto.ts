import { IsBoolean, IsMongoId, IsOptional } from 'class-validator';

export class CreateUserPlatformDto {
  @IsMongoId()
  platformId!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
