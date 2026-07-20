export class UserResponseDto {
  id!: string;
  email!: string;
  firstName!: string;
  lastName!: string;
  isEmailVerified!: boolean;
  createdAt!: Date;

  static from(user: any): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = String(user._id ?? user.id);
    dto.email = user.email;
    dto.firstName = user.firstName;
    dto.lastName = user.lastName;
    dto.isEmailVerified = user.isEmailVerified ?? false;
    dto.createdAt = user.createdAt;
    return dto;
  }
}
