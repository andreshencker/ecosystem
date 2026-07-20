import {
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateProviderCredentialsDto {
  @IsMongoId()
  companyChannelProviderId!: string;

  @IsString()
  @IsNotEmpty()
  tag!: string;

  // payload plano (antes de encriptar)
  @IsObject()
  credentials!: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
