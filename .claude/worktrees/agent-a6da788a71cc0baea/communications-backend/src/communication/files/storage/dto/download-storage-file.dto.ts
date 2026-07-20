import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class DownloadStorageFileDto {
  @IsMongoId()
  companyId!: string;

  @IsString()
  key!: string;

  @IsOptional()
  @IsString()
  fileName?: string;
}
