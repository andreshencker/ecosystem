import { Transform } from 'class-transformer';
import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class ReplaceStorageFileDto {
  @IsMongoId()
  companyId!: string;

  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  folder?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  })
  maxBytes?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value;
    return String(value)
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  })
  allowedExtensions?: string[];

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value;
    return String(value)
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  })
  allowedMimeTypes?: string[];
}
