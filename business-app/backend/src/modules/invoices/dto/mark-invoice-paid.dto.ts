import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class MarkInvoicePaidDto {
  @IsDateString() paidAt!: string;
  @IsOptional() @IsString() @MaxLength(200) reference?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}
