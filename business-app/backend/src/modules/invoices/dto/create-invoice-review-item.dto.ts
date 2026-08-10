import { IsDateString, IsNotEmpty, IsNumberString, IsString, Matches } from 'class-validator';

export class CreateInvoiceReviewItemDto {
  @IsString() @IsNotEmpty() groupId!: string;
  @IsDateString() date!: string;
  @IsString() @IsNotEmpty() concept!: string;
  @IsNumberString() @Matches(/^\d+(\.\d{1,2})?$/) amount!: string;
}
