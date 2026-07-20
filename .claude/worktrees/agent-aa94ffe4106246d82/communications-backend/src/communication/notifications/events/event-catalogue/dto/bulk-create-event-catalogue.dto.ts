// src/notifications/events/event-catalogue/dto/bulk-create-event-catalogue.dto.ts
import { Type } from 'class-transformer';
import { IsArray, IsMongoId, ValidateNested } from 'class-validator';
import { BulkEventItemDto } from './bulk-event-item.dto';

export class BulkCreateEventCatalogueDto {
  @IsMongoId()
  domainCatalogueId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkEventItemDto)
  items!: BulkEventItemDto[];
}
