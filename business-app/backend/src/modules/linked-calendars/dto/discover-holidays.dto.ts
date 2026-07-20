import { IsNotEmpty, IsString } from 'class-validator';

export class DiscoverHolidaysDto {
  @IsString()
  @IsNotEmpty({ message: 'connectionId is required' })
  connectionId!: string;
}
