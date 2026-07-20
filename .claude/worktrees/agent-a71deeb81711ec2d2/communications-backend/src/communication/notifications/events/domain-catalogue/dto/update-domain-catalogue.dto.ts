import { PartialType } from '@nestjs/mapped-types';
import { CreateDomainCatalogueDto } from './create-domain-catalogue.dto';

export class UpdateDomainCatalogueDto extends PartialType(
  CreateDomainCatalogueDto,
) {}
