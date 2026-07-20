import { IsMongoId } from 'class-validator';

export class CreateAdminIndicatorDto {
  @IsMongoId()
  indicatorProjectId!: string;
}
