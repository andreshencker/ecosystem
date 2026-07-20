import { IsEnum, IsMongoId } from 'class-validator';

export class ChannelToUseDto {
  @IsEnum(['email', 'sms'])
  channel!: 'email' | 'sms';

  @IsMongoId()
  providerCredentialsId!: string;
}
