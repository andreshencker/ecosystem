import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  current!: string;

  @IsString()
  @MinLength(6)
  next!: string;
}
