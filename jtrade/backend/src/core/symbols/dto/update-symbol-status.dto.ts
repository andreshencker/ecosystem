import { IsBoolean } from 'class-validator';

export class UpdateSymbolStatusDto {
  @IsBoolean()
  isActive: boolean;
}