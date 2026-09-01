import {
  ArrayMaxSize, IsArray, IsBoolean, IsIn, IsMongoId, IsNumber, IsOptional, IsString, Matches, MaxLength,
  MinLength, ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PRODUCT_PARAM_REPEAT, PRODUCT_PARAM_TYPES } from '../schemas/product.schema';

const toBoolean = ({ value }: { value: unknown }) => value === true || value === 'true' || value === '1';

export class ProductParamDto {
  @IsString() @Matches(/^[a-zA-Z][a-zA-Z0-9_]*$/, { message: 'key must be one word: letters, digits, underscore' }) @MaxLength(50)
  key!: string;

  @IsString() @MinLength(1) @MaxLength(120) label!: string;

  @IsIn(PRODUCT_PARAM_TYPES as unknown as string[]) type!: string;

  @IsOptional() defaultValue?: unknown;

  @IsOptional() @IsBoolean() required?: boolean;

  @IsOptional() @IsIn(PRODUCT_PARAM_REPEAT as unknown as string[]) repeat?: string;
  @IsOptional() @IsString() @MaxLength(60) group?: string;

  @IsOptional() @IsNumber() min?: number;
  @IsOptional() @IsNumber() max?: number;

  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(50) options?: string[];
}

export class CreateProductDto {
  @IsMongoId() typeProductId!: string;
  @IsMongoId() platformId!: string;

  @IsString() @MinLength(2) @MaxLength(80) key!: string;
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string;

  /** Only applied when the product type is 'signals'. */
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsMongoId({ each: true }) indicatorIds?: string[];
}

/** typeProductId and platformId are immutable — not accepted here. */
export class UpdateProductDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) key?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160) name?: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsMongoId({ each: true }) indicatorIds?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => ProductParamDto)
  params?: ProductParamDto[];

  @IsOptional() @IsIn(['draft', 'pending_review', 'archived']) status?: string;
}

export class CreateProductVersionDto {
  @IsString() @MinLength(1) @MaxLength(50) version!: string;
  @IsOptional() @IsString() @MaxLength(4000) releaseNotes?: string;
  @IsOptional() @Transform(toBoolean) @IsBoolean() isCurrentVersion?: boolean;
}

export class ReplaceProductVersionFileDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(50) version?: string;
  @IsOptional() @IsString() @MaxLength(4000) releaseNotes?: string;
  @IsOptional() @Transform(toBoolean) @IsBoolean() isCurrentVersion?: boolean;
}
