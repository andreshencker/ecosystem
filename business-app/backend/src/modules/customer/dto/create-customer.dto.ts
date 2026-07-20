import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  Matches,
  ValidateNested,
  IsObject,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Communication Purpose sub-DTOs ──────────────────────────────────────────

export class CommPurposeRecipientDto {
  /** Email address (required for email channel recipients). */
  @IsOptional()
  @IsEmail({}, { message: 'recipient email must be a valid address' })
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsEnum(['to', 'cc', 'bcc'], { message: 'recipientType must be "to", "cc" or "bcc"' })
  recipientType?: 'to' | 'cc' | 'bcc';

  /** Phone number (required for sms channel recipients). */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}

export class CommPurposeChannelDto {
  @IsEnum(['email', 'sms'])
  channel!: 'email' | 'sms';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommPurposeRecipientDto)
  recipients?: CommPurposeRecipientDto[];
}

export class CustomerCommPurposeDto {
  @IsString()
  @MinLength(1, { message: 'communicationDomainId is required' })
  communicationDomainId!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommPurposeChannelDto)
  channels?: CommPurposeChannelDto[];
}

// ─── Location sub-DTO ────────────────────────────────────────────────────────

export class EmbeddedLocationDto {
  /** Existing DB ObjectId — sent on update to preserve the location's _id. */
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MinLength(1, { message: 'Tag is required' })
  @MaxLength(100)
  tag!: string;

  @IsString()
  @MinLength(1, { message: 'Country is required' })
  @MaxLength(100)
  country!: string;

  @IsString()
  @MinLength(1, { message: 'Address Line 1 is required' })
  @MaxLength(200)
  line1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

  @IsString()
  @MinLength(1, { message: 'City is required' })
  @MaxLength(100)
  city!: string;

  @IsString()
  @MinLength(1, { message: 'Postcode is required' })
  @MaxLength(20)
  postalCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;
}

// ─── Shared sub-DTOs ─────────────────────────────────────────────────────────

export class BillingRecipientDto {
  @ApiProperty({
    enum: ['invoice', 'quote', 'budget', 'purchase_order', 'statement', 'receipt', 'contract', 'general', 'other'],
    default: 'invoice',
    example: 'invoice',
    description: 'The type of business document this recipient should receive.',
  })
  @IsEnum(
    ['invoice', 'quote', 'budget', 'purchase_order', 'statement', 'receipt', 'contract', 'general', 'other'],
    { message: 'documentType must be a valid document type' },
  )
  documentType!: string;

  @ApiProperty({ example: 'accounts@company.com', maxLength: 254 })
  @IsEmail({}, { message: 'billing recipient email must be a valid email address' })
  @MaxLength(254)
  email!: string;

  @ApiProperty({
    enum: ['to', 'cc', 'bcc'],
    example: 'to',
    description: 'Delivery role for the recipient (To, CC, or BCC).',
  })
  @IsEnum(['to', 'cc', 'bcc'], { message: 'recipientType must be "to", "cc" or "bcc"' })
  recipientType!: 'to' | 'cc' | 'bcc';
}

export class CustomerAddressDto {
  @IsString()
  @MinLength(1, { message: 'Country is required' })
  @MaxLength(100)
  country!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsString()
  @MinLength(1, { message: 'City is required' })
  @MaxLength(100)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @IsString()
  @MinLength(1, { message: 'Address Line 1 is required' })
  @MaxLength(200)
  line1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;
}

/**
 * A contact person embedded within a Customer document.
 * Used when creating or replacing the full contacts array.
 * firstName holds the full name when created from a single-name form field.
 */
export class EmbeddedContactDto {
  @IsString()
  @MinLength(1, { message: 'Contact name is required' })
  @MaxLength(200)
  firstName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'contact email must be a valid email address' })
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

  /**
   * Index into the co-submitted `locations` array.
   * The service maps this to the generated location._id so the contact can
   * reference a newly created location that has no DB id yet at submission time.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  locationIndex?: number;
}

/**
 * Primary contact person for a Customer (legacy field).
 * Separate from invoice recipients — this is who we communicate with day-to-day.
 */
export class PrimaryContactDto {
  /** Full name (e.g. "John Smith", "Jane Doe"). */
  @IsString()
  @MinLength(1, { message: 'Contact name is required' })
  @MaxLength(200)
  name!: string;

  /** Direct email for the contact person (optional). */
  @IsOptional()
  @IsEmail({}, { message: 'contact email must be a valid email address' })
  @MaxLength(254)
  email?: string;

  /** Direct phone for the contact person (optional). */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}

// ─── Create DTO ───────────────────────────────────────────────────────────────

export class CreateCustomerDto {
  @IsEnum(['company', 'individual'])
  type!: 'company' | 'individual';

  /**
   * Primary display name.
   * For company: company/trading name.
   * For individual: full name.
   */
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  displayName!: string;

  /** Australian Business Number — 11 digits (company customers only). */
  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, { message: 'abn must be exactly 11 digits' })
  abn?: string;

  /**
   * Primary contact person — who we communicate with day-to-day.
   * Not necessarily the same as invoice recipients.
   */
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PrimaryContactDto)
  contact?: PrimaryContactDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CustomerAddressDto)
  address?: CustomerAddressDto;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  /**
   * Contacts for this customer. At most one may have isPrimary=true.
   * When provided, supersedes the legacy `contact` field.
   * The service derives the `contact` (PrimaryContact) field from the primary entry.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => EmbeddedContactDto)
  contacts?: EmbeddedContactDto[];

  /**
   * Physical locations for this customer.
   * Replaces the legacy single `address` field.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => EmbeddedLocationDto)
  locations?: EmbeddedLocationDto[];

  /**
   * Communication Purpose configurations.
   * Each entry associates one Communication Purpose with recipient lists for
   * each channel (email, SMS) that the purpose supports.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CustomerCommPurposeDto)
  communicationPurposes?: CustomerCommPurposeDto[];

  /**
   * @deprecated Use communicationPurposes instead.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => BillingRecipientDto)
  billingRecipients?: BillingRecipientDto[];
}
