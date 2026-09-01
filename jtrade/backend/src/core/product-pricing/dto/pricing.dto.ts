import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class PricingPromotionDto {
  @IsIn(['percentage', 'fixed_amount', 'direct_price']) type!: 'percentage' | 'fixed_amount' | 'direct_price';
  @IsInt() @Min(0) value!: number;
  @IsOptional() @IsString() startsAt?: string | null;
  @IsOptional() @IsString() endsAt?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateProductPricingDto {
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @MaxLength(80) key!: string;
  @IsString() @MaxLength(120) name!: string;
  @IsIn(['one_time', 'recurring']) pricingType!: 'one_time' | 'recurring';
  @IsInt() @Min(0) amount!: number;
  @IsOptional() @IsIn(['USD']) currency?: 'USD';
  @IsOptional() @IsIn(['month', 'year']) interval?: 'month' | 'year' | null;
  @IsOptional() @IsInt() @Min(1) @Max(120) intervalCount?: number | null;
  @IsOptional() @IsBoolean() trialEnabled?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(365) trialDays?: number;
  @IsOptional() @ValidateNested() @Type(() => PricingPromotionDto) promotion?: PricingPromotionDto | null;
  @IsOptional() @IsIn(['active', 'inactive']) status?: 'active' | 'inactive';
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsInt() @Min(0) displayOrder?: number;
}

export class UpdateProductPricingDto {
  @IsOptional() @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @MaxLength(80) key?: string;
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsIn(['one_time', 'recurring']) pricingType?: 'one_time' | 'recurring';
  @IsOptional() @IsInt() @Min(0) amount?: number;
  @IsOptional() @IsIn(['USD']) currency?: 'USD';
  @IsOptional() @IsIn(['month', 'year']) interval?: 'month' | 'year' | null;
  @IsOptional() @IsInt() @Min(1) @Max(120) intervalCount?: number | null;
  @IsOptional() @IsBoolean() trialEnabled?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(365) trialDays?: number;
  @IsOptional() @ValidateNested() @Type(() => PricingPromotionDto) promotion?: PricingPromotionDto | null;
  @IsOptional() @IsIn(['active', 'inactive']) status?: 'active' | 'inactive';
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsInt() @Min(0) displayOrder?: number;
}
