import { IsNotEmpty, IsString } from 'class-validator';

export class LinkHolidayCalendarDto {
  @IsString()
  @IsNotEmpty({ message: 'connectionId is required' })
  connectionId!: string;

  @IsString()
  @IsNotEmpty({ message: 'externalCalendarId is required' })
  externalCalendarId!: string;
}
