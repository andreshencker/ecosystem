import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

export class BulkCreateSymbolDto {
  /** Raw symbol strings — normalized (trim + uppercase) and de-duplicated server-side. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsString({ each: true })
  symbols!: string[];
}
