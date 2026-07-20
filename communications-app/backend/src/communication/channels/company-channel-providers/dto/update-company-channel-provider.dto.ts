import { IsBoolean, IsMongoId, IsOptional } from 'class-validator';

export class UpdateCompanyChannelProviderDto {
  @IsOptional()
  @IsMongoId()
  providerId?: string;

  @IsOptional()
  @IsMongoId()
  channelId?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
