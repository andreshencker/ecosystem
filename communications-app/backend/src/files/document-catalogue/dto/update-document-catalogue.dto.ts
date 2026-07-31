import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateDocumentCatalogueDto } from './create-document-catalogue.dto';

export class UpdateDocumentCatalogueDto extends PartialType(
  OmitType(CreateDocumentCatalogueDto, ['documentDomainCatalogueId'] as const),
) {}
