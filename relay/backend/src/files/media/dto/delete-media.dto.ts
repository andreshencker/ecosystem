import { IsMongoId, IsString } from 'class-validator';

export class DeleteMediaDto {
  @IsMongoId()
  companyId!: string;

  @IsString()
  key!: string;
}
