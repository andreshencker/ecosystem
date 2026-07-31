import { IsInt, IsOptional, IsString, Min } from 'class-validator';
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
}
