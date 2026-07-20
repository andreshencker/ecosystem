import { IsString } from 'class-validator';

export class PreviewLayoutDto {
  @IsString()
  layoutTemplateId!: string;
}
