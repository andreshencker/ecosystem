import { IsString } from 'class-validator';

export class GetSignalInformationDto {
  @IsString()
  symbol: string;

  @IsString()
  accountNumber: string;

  @IsString()
  timeFrame: string;

  @IsString()
  latestSignalId: string;

  @IsString()
  eaVersion: string;

  @IsString()
  eaVersionId: string;
}
