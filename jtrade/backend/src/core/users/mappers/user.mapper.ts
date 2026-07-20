// src/users/mappers/user.mapper.ts
import { UserDocument } from '../schemas/user.schema';
import { UserResponseDto } from '../dto/user-response.dto';

export class UserMapper {
  static toResponse(
    user: UserDocument | (any & { _id?: any }),
  ): UserResponseDto {
    const plain =
      typeof (user as any).toObject === 'function'
        ? (user as any).toObject()
        : user;

    return {
      id: plain._id?.toString?.() ?? String(plain._id),
      firstName: plain.firstName,
      middleName: plain.middleName,
      lastName: plain.lastName,
      secondLastName: plain.secondLastName,
      email: plain.email,
      phone: plain.phone,
      role: plain.role,
      isActive: plain.isActive,
      avatarUrl: plain.avatarUrl,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
    };
  }

  static toResponseList(
    users: Array<UserDocument | (any & { _id?: any })>,
  ): UserResponseDto[] {
    return users.map((u) => this.toResponse(u));
  }
}
