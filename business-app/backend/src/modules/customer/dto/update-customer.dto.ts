import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
  ValidateNested,
  IsObject,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CustomerAddressDto, BillingRecipientDto, CustomerCommPurposeDto, EmbeddedContactDto, EmbeddedLocationDto } from './create-customer.dto';

/**
 * Partial update DTO for the primary contact person.
 * Only the provided fields are updated — omitted fields are left unchanged.
 */
export class UpdatePrimaryContactDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'contact email must be a valid email address' })
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}

export class UpdateCustomerDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) displayName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, { message: 'abn must be exactly 11 digits' })
  abn?: string;

  /** Update the primary contact person fields. */
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdatePrimaryContactDto)
  contact?: UpdatePrimaryContactDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CustomerAddressDto)
  address?: CustomerAddressDto;

  @IsOptional() @IsString() @MaxLength(2000) notes?: string;

  /**
   * Full replacement of the customer's contacts array.
   * When provided, the existing contacts[] is replaced atomically.
   * At most one entry should have isPrimary=true.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => EmbeddedContactDto)
  contacts?: EmbeddedContactDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => EmbeddedLocationDto)
  locations?: EmbeddedLocationDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CustomerCommPurposeDto)
  communicationPurposes?: CustomerCommPurposeDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => BillingRecipientDto)
  billingRecipients?: BillingRecipientDto[];
}
