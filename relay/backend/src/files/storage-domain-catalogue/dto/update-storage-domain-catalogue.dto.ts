import { PartialType } from '@nestjs/mapped-types';
import { CreateStorageDomainCatalogueDto } from './create-storage-domain-catalogue.dto';

export class UpdateStorageDomainCatalogueDto extends PartialType(
  CreateStorageDomainCatalogueDto,
) {}
