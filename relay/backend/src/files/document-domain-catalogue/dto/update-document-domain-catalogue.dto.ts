import { PartialType } from '@nestjs/mapped-types';
import { CreateDocumentDomainCatalogueDto } from './create-document-domain-catalogue.dto';

export class UpdateDocumentDomainCatalogueDto extends PartialType(
  CreateDocumentDomainCatalogueDto,
) {}
