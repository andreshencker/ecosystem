import { IsNotEmpty, IsString } from 'class-validator';

export class SetupCalendarDto {
  /** Calendar account (connectionId) to use for the operation. */
  @IsString()
  @IsNotEmpty({ message: 'connectionId is required' })
  connectionId!: string;
}
