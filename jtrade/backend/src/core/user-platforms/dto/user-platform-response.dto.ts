// user-platform-response.dto.ts
import { UserPlatformStatus } from '../schemas/user-platform.schema';
import {
  ConnectionType,
  PlatformCategory,
} from '../../platforms/schemas/platform.schema';
import { UserRole } from '../../users/schemas/user.schema';

export class UserPlatformResponseDto {
  id: string;
  userId: string;
  platformId: string;

  status: UserPlatformStatus;
  isActive: boolean;
  isDefault: boolean;

  user?: {
    id: string;
    fullName?: string;
    email: string;
    role: UserRole;
    avatarUrl?: string;
  };

  platform?: {
    id: string;
    name: string;
    category: PlatformCategory;
    connectionType: ConnectionType;
    imageUrl?: string;
    isActive: boolean;
    isSupported: boolean;
  };

  createdAt?: Date;
  updatedAt?: Date;
}
