import { IsString } from 'class-validator';

export class CreateMetatraderSignalDto {
  @IsString()
  webHookKey!: string;

  @IsString()
  alertId!: string;
}
