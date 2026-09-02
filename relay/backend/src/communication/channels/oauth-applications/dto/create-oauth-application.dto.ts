import { IsNotEmpty, IsString } from 'class-validator';

export class CreateOAuthApplicationDto {
  @IsString()
  @IsNotEmpty()
  providerFamily!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @IsString()
  @IsNotEmpty()
  clientSecret!: string;
}
