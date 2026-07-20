import { IsBoolean, IsMongoId, IsOptional, IsString } from 'class-validator';

export class CreateSymbolDto {
  @IsMongoId()
  companyProviderId!: string;

  @IsString()
  symbol!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
