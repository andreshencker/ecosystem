import {
  IsBoolean,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateStorageDomainCatalogueDto {
  @IsMongoId()
  companyId!: string;

  @IsMongoId()
  providerCredentialsId!: string;

  @IsString()
  @IsNotEmpty()
  domainKey!: string;

  @IsIn(['public', 'private'])
  visibility!: 'public' | 'private';

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
