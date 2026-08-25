import {
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PdfSectionConfigDto {
  @IsString() @IsNotEmpty() key!: string;
  @IsString() @IsNotEmpty() type!: string;
  @IsString() label?: string;
  @IsBoolean() @IsOptional() enabled?: boolean;
}

export class PdfFormatContractDto {
  @IsBoolean() @IsOptional() enabled?: boolean;
  @IsString() @IsOptional() version?: string;
  @IsString() @IsOptional() layoutType?: string;
  @IsString() @IsOptional() layoutKey?: string;
  @IsOptional() sections?: PdfSectionConfigDto[];
  @IsOptional() requiredFields?: string[];
  @IsOptional() optionalFields?: string[];
  @IsString() @IsOptional() notes?: string;
}

export class XlsxColumnConfigDto {
  @IsString() @IsNotEmpty() key!: string;
  @IsString() label?: string;
  @IsBoolean() @IsOptional() isNumeric?: boolean;
}

export class XlsxWorksheetConfigDto {
  @IsString() @IsNotEmpty() key!: string;
  @IsString() label?: string;
  @IsString() @IsOptional() dataSource?: string;
  @IsOptional() columns?: XlsxColumnConfigDto[];
}

export class XlsxFormatContractDto {
  @IsBoolean() @IsOptional() enabled?: boolean;
  @IsString() @IsOptional() version?: string;
  @IsOptional() worksheets?: XlsxWorksheetConfigDto[];
  @IsOptional() requiredFields?: string[];
  @IsOptional() optionalFields?: string[];
  @IsString() @IsOptional() notes?: string;
}

export class CsvColumnConfigDto {
  @IsString() @IsNotEmpty() key!: string;
  @IsString() label?: string;
}

export class CsvFormatContractDto {
  @IsBoolean() @IsOptional() enabled?: boolean;
  @IsString() @IsOptional() version?: string;
  @IsString() @IsOptional() dataSource?: string;
  @IsBoolean() @IsOptional() includeHeaders?: boolean;
  @IsOptional() columns?: CsvColumnConfigDto[];
  @IsOptional() requiredFields?: string[];
  @IsOptional() optionalFields?: string[];
  @IsString() @IsOptional() notes?: string;
}

export class DocumentFormatContractsDto {
  @IsOptional() @IsObject() pdf?: PdfFormatContractDto;
  @IsOptional() @IsObject() xlsx?: XlsxFormatContractDto;
  @IsOptional() @IsObject() csv?: CsvFormatContractDto;
}

export class CreateDocumentCatalogueDto {
  @IsMongoId()
  documentDomainCatalogueId!: string;

  @IsString()
  @IsNotEmpty()
  documentKey!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DocumentFormatContractsDto)
  formatContracts?: DocumentFormatContractsDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
