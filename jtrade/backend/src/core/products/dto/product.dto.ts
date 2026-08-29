import { IsArray, IsIn, IsMongoId, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ProductPlatformDto {
  @IsMongoId() platformId!: string;
  @IsOptional() @IsIn(['download', 'webhook', 'api', 'cloud', 'managed']) deliveryMode?: string;
  @IsOptional() @IsIn(['none', 'signal_based', 'bot_execution', 'copy_trading', 'strategy_rules']) runtimeMode?: string;
  @IsOptional() @IsIn(['draft', 'published', 'suspended', 'archived']) status?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class CreateProductDto {
  @IsMongoId() typeProductId!: string;
  @IsString() @MinLength(2) @MaxLength(80) key!: string;
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductPlatformDto) platforms?: ProductPlatformDto[];
}

export class UpdateProductDto {
  @IsOptional() @IsMongoId() typeProductId?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) key?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160) name?: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductPlatformDto) platforms?: ProductPlatformDto[];
  @IsOptional() @IsIn(['draft', 'pending_review', 'published', 'suspended', 'archived']) status?: string;
}

export class CreateProductVersionDto {
  @IsMongoId() productId!: string;
  @IsMongoId() platformId!: string;
  @IsString() @MinLength(1) @MaxLength(50) version!: string;
  @IsString() fileName!: string;
  @IsOptional() @IsString() originalFileName?: string;
  @IsString() extension!: string;
  @IsString() fileKey!: string;
  @IsOptional() size?: number;
  @IsOptional() @IsString() contentType?: string;
  @IsOptional() @IsString() @MaxLength(4000) releaseNotes?: string;
  @IsOptional() @IsIn(['draft', 'published', 'deprecated']) status?: string;
}
