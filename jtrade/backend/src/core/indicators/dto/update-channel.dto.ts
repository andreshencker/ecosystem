import { IsBoolean } from 'class-validator';

export class UpdateChannelDto {
  @IsBoolean()
  enabled!: boolean;
}
