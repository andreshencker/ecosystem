import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateShiftDto {
  @IsMongoId({ message: 'contractId must be a valid ObjectId' })
  contractId!: string;

  /**
   * The Linked Calendar (flow=shifts) to create the provider event in.
   * Required for shifts that should be pushed to a calendar.
   * When omitted the Shift is created locally only (manual, no provider event).
   */
  @IsOptional()
  @IsMongoId({ message: 'linkedCalendarId must be a valid MongoDB ObjectId' })
  linkedCalendarId?: string;

  /**
   * Event title to use in the provider calendar.
   * Defaults to the contract position name when omitted.
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be HH:mm' })
  startTime!: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be HH:mm' })
  endTime!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(480)
  breakMinutes?: number;

  @IsOptional()
  @IsEnum(['draft', 'confirmed', 'cancelled'], {
    message: 'status must be draft, confirmed, or cancelled',
  })
  status?: 'draft' | 'confirmed' | 'cancelled';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
