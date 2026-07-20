import { IsMongoId } from 'class-validator';

export class CreateUserProjectPlatformDto {
  @IsMongoId()
  projectCodePlatformId!: string;
}
