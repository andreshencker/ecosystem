import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateEventCatalogueDto } from './create-event-catalogue.dto';

export class UpdateEventCatalogueDto extends PartialType(
  OmitType(CreateEventCatalogueDto, ['domainCatalogueId'] as const),
) {}
