import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class AddMethodDto {
  @IsString() @IsNotEmpty() @Matches(/^[a-z0-9-]{2,40}$/) method!: string;
}

export class UpsertMethodConfigDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsBoolean() isRequired?: boolean;
  @IsOptional() @IsString() @MaxLength(80) displayName?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) displayOrder?: number;
  @IsOptional() @IsString() @MaxLength(60) relayConnectionId?: string;
  /** Method-specific — validated by the method folder. */
  @IsOptional() @IsObject() settings?: Record<string, unknown>;
}
