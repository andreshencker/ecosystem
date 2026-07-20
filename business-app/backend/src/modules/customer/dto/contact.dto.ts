import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateContactDto {
  /** Full name — required. Stored in firstName; lastName is left empty for
   *  contacts created via the single-name form field. */
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  firstName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  role?: string;

  /** When true, this contact becomes the primary contact for the customer.
   *  All other contacts will have their isPrimary flag cleared. */
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  /** ObjectId of a CustomerLocation within the same Customer document. Null removes the assignment. */
  @IsOptional()
  @IsString()
  locationId?: string | null;
}

export class UpdateContactDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  role?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsString()
  locationId?: string | null;
}
