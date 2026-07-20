import { IsEnum } from 'class-validator';
import { UserPlatformStatus } from '../schemas/user-platform.schema';

export class ChangeStatusDto {
  @IsEnum(UserPlatformStatus)
  status!: UserPlatformStatus;
}
