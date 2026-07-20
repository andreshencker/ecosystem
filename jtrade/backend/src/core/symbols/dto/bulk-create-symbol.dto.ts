import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

class BulkCreateSymbolItemDto {
  @IsString()
  symbol!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BulkCreateSymbolDto {
  @IsMongoId()
  companyProviderId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkCreateSymbolItemDto)
  items!: BulkCreateSymbolItemDto[];
}
