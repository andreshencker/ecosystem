import { IsBoolean, IsMongoId, IsOptional } from 'class-validator';

export class AdminCreateUserPlatformDto {
  @IsMongoId()
  userId!: string;

  @IsMongoId()
  platformId!: string;
}
