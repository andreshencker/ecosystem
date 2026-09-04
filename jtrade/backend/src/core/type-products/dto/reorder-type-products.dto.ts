import { ArrayNotEmpty, IsArray, IsMongoId } from 'class-validator';

/** Full ordered list of type ids — displayOrder is assigned from the array index. */
export class ReorderTypeProductsDto {
  @IsArray() @ArrayNotEmpty() @IsMongoId({ each: true })
  orderedIds!: string[];
}
