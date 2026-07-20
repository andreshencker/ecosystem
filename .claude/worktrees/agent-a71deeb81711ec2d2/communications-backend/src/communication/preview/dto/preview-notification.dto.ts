import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class PreviewNotificationDto {
  @IsString()
  layoutTemplateId!: string;

  @IsString()
  eventCatalogueId!: string;

  /**
   * true  -> renderiza usando payload
   * false -> deja placeholders {{var}}
   */
  @IsOptional()
  @IsBoolean()
  mock?: boolean;

  /**
   * Payload enviado DESDE Postman
   * Debe coincidir con required/optional del evento
   */
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;
}
