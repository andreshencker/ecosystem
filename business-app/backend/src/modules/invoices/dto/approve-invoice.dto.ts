import { IsDateString, IsMongoId, IsString, IsNotEmpty, Matches } from 'class-validator';

export class ApproveInvoiceDto {
  /** Deterministic groupId from BI (sha256 hex). */
  @IsString()
  @IsNotEmpty()
  groupId!: string;

  @IsMongoId()
  customerId!: string;

  @IsMongoId()
  contractId!: string;

  /** YYYY-MM-DD */
  @IsDateString()
  periodStart!: string;

  /** YYYY-MM-DD */
  @IsDateString()
  periodEnd!: string;
}
