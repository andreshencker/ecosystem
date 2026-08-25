import { IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateRefundDto {
  @IsString()
  paymentId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) =>
    value !== undefined ? parseInt(String(value), 10) : undefined,
  )
  amountMinor?: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  metadata?: Record<string, string>;

  /**
   * Provider-specific fields that cannot be expressed in the canonical
   * refund contract. Must be sent inside this bag — never at the top level.
   * No secrets, tokens, or credentials should ever appear here.
   */
  @IsOptional()
  @IsObject()
  providerExtensions?: Record<string, unknown>;
}
