import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import type { DocumentFormat } from '../schemas/document-domain-catalogue.schema';
import { SUPPORTED_DOCUMENT_FORMATS } from '../schemas/document-domain-catalogue.schema';

export class CreateDocumentDomainCatalogueDto {
  @IsMongoId()
  companyId!: string;

  @IsString()
  @IsNotEmpty()
  domainKey!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  domainCategory!: string;

  @IsOptional()
  @IsArray()
  @IsEnum(SUPPORTED_DOCUMENT_FORMATS, { each: true })
  allowedFormats?: DocumentFormat[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
