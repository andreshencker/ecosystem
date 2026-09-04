import {
  ArrayMaxSize, IsArray, IsBoolean, IsIn, IsMongoId, IsNumber, IsOptional, IsString, Matches, MaxLength,
  MinLength, ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PRODUCT_PARAM_REPEAT, PRODUCT_PARAM_TYPES } from '../schemas/product.schema';

const toBoolean = ({ value }: { value: unknown }) => value === true || value === 'true' || value === '1';

// ── Presentation (commercial content shown before purchase) ───────────────────

export class ProductFaqEntryDto {
  @IsOptional() @IsString() @MaxLength(300) question?: string;
  @IsOptional() @IsString() @MaxLength(4000) answer?: string;
}

export class ProductPresentationDto {
  @IsOptional() @IsString() @MaxLength(8000) fullDescription?: string;
  @IsOptional() @IsString() @MaxLength(4000) whatItDoes?: string;
  @IsOptional() @IsString() @MaxLength(4000) howItWorks?: string;
  @IsOptional() @IsString() @MaxLength(4000) howToUse?: string;
  @IsOptional() @IsString() @MaxLength(4000) whatYouReceive?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(50) features?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(50) requirements?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(50) limitations?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => ProductFaqEntryDto) faq?: ProductFaqEntryDto[];
  @IsOptional() @IsString() @MaxLength(500) documentationUrl?: string;
  @IsOptional() @IsString() @MaxLength(500) supportUrl?: string;
  @IsOptional() @IsString() @MaxLength(500) videoUrl?: string;
}

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
  /** Required — chosen on the type-selection screen before onboarding. Immutable after creation. */
  @IsMongoId() typeProductId!: string;
  /** Optional — the deferred ProductVersion technical target (single platform). */
  @IsOptional() @IsMongoId() platformId?: string;
  /** Commercial: the trading platforms this product operates on (Step 5). */
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsMongoId({ each: true }) platformIds?: string[];

  @IsString() @MinLength(2) @MaxLength(80) key!: string;
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string;

  // Identity (commercial)
  @IsOptional() @IsString() @MaxLength(120) tagline?: string;
  @IsOptional() @IsString() @MaxLength(200) shortDescription?: string;
  @IsOptional() @IsString() @MaxLength(500) logoUrl?: string;
  @IsOptional() @IsString() @MaxLength(500) coverImageUrl?: string;

  /** Only applied when the product type is 'signals' (legacy path). */
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsMongoId({ each: true }) indicatorIds?: string[];
}

/**
 * typeProductId and the singular platformId are NOT accepted here — both are
 * immutable after creation. The commercial platformIds list IS editable.
 */
export class UpdateProductDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) key?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160) name?: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string;

  // Identity (commercial)
  @IsOptional() @IsString() @MaxLength(120) tagline?: string;
  @IsOptional() @IsString() @MaxLength(200) shortDescription?: string;
  @IsOptional() @IsString() @MaxLength(500) logoUrl?: string;
  @IsOptional() @IsString() @MaxLength(500) coverImageUrl?: string;

  // Presentation (commercial)
  @IsOptional() @ValidateNested() @Type(() => ProductPresentationDto) presentation?: ProductPresentationDto;

  // Classification (commercial discovery — type is NOT here anymore)
  @IsOptional() @IsString() @MaxLength(60) category?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(20) tags?: string[];

  // Platforms the product operates on (commercial — Step 5, editable)
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsMongoId({ each: true }) platformIds?: string[];

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
