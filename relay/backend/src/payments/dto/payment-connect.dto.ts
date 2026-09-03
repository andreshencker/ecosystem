import {
  IsEmail,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateConnectedPaymentAccountDto {
  @IsMongoId() connectionId!: string;
  @IsString() @IsNotEmpty() @MaxLength(160) connectedOrganizationId!: string;
  @IsOptional() @IsString() @Length(2, 2) country?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(160) businessName?: string;
}

export class CreateConnectOnboardingDto {
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  refreshUrl!: string;
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  returnUrl!: string;
}

export class CreateConnectCheckoutDto {
  @IsMongoId() connectionId!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) applicationKey!: string;
  @IsString() @IsNotEmpty() @MaxLength(200) externalReference!: string;
  @IsString() @IsNotEmpty() @MaxLength(160) connectedOrganizationId!: string;
  @IsInt() @Min(1) amountMinor!: number;
  @IsInt() @Min(0) applicationFeeMinor!: number;
  @IsString() @Matches(/^[A-Za-z]{3}$/) currency!: string;
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  successUrl!: string;
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  cancelUrl!: string;
  @IsOptional() @IsString() @MaxLength(240) description?: string;
  @IsOptional() @IsObject() metadata?: Record<string, string>;
}
