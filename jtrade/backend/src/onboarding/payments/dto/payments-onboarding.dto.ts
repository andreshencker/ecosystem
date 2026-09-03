import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';

/** Fields some gateways need before the hosted configuration starts. */
export class StartMethodDto {
  /** ISO-2 country. Immutable at Stripe once set. */
  @IsOptional() @IsString() @Length(2, 2) country?: string;

  @IsOptional() @IsEmail() email?: string;

  @IsOptional() @IsString() @MaxLength(160) businessName?: string;
}
