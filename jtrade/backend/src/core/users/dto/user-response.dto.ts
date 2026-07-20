import { UserRole } from '../schemas/user.schema';

export class UserResponseDto {
  id: string;

  firstName: string;
  middleName?: string;
  lastName: string;
  secondLastName?: string;
  phone?: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl?: string;

  createdAt?: Date;
  updatedAt?: Date;
}
