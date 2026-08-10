import { IsDateString } from 'class-validator';

export class MarkInvoiceSentDto {
  @IsDateString()
  sentAt!: string;
}
