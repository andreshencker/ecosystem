import { Types } from 'mongoose';
import { UserPlatform } from '../schemas/user-platform.schema';
import { UserPlatformResponseDto } from '../dto/user-platform-response.dto';

import {
  ConnectionType,
  PlatformCategory,
} from '../../platforms/schemas/platform.schema';

import { UserRole } from '../../users/schemas/user.schema';

type UserPlatformLike = Partial<UserPlatform> & {
  _id?: any;
  id?: any;
  userId?: Types.ObjectId | string;
  platformId?: Types.ObjectId | string;

  // populated
  platform?: any;
  user?: any;

  createdAt?: Date;
  updatedAt?: Date;
};

export class UserPlatformMapper {
  private static buildFullName(user: any): string | undefined {
    if (!user) return undefined;

    const full = [
      user.firstName,
      user.middleName,
      user.lastName,
      user.secondLastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    return full || undefined;
  }

  static toResponse(doc: UserPlatformLike): UserPlatformResponseDto {
    if (!doc) {
      throw new Error(
        'UserPlatformMapper.toResponse called with null/undefined',
      );
    }

    const platform = doc.platform as any | undefined;
    const user = doc.user as any | undefined;

    return {
      id: String(doc._id ?? doc.id),
      userId: String(doc.userId),
      platformId: String(doc.platformId),

      status: doc.status!,
      isActive: !!doc.isActive,
      isDefault: !!doc.isDefault,

      user: user
        ? {
            id: String(user._id ?? user.id),
            fullName: this.buildFullName(user),
            email: user.email,
            role: user.role as UserRole,
          }
        : undefined,

      platform: platform
        ? {
            id: String(platform._id ?? platform.id),
            name: platform.name,
            category: platform.category as PlatformCategory,
            connectionType: platform.connectionType as ConnectionType,
            imageUrl: platform.imageUrl,
            isActive: !!platform.isActive,
            isSupported: !!platform.isSupported,
          }
        : undefined,

      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  static toResponseList(docs: UserPlatformLike[]): UserPlatformResponseDto[] {
    return (docs ?? []).map((d) => this.toResponse(d));
  }
}
