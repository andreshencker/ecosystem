import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class CreateCompanyWithOwnerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName!: string;

  @IsString()
  @MinLength(1)
  timezone!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  ownerFirstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  ownerLastName!: string;

  @IsEmail()
  ownerEmail!: string;
}
