import { IsBoolean, IsMongoId, IsOptional } from 'class-validator';

export class CreateCompanyChannelProviderDto {
  @IsMongoId()
  companyId!: string;

  @IsMongoId()
  providerId!: string;

  @IsMongoId()
  channelId!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
