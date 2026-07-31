import { IsMongoId, IsString } from 'class-validator';

export class PreviewDocumentStructureDto {
  @IsMongoId()
  companyId!: string;

  /**
   * Canonical key: "domainKey.documentKey.format"
   * e.g. "invoice.shift-invoice.pdf"
   */
  @IsString()
  canonicalKey!: string;
}
