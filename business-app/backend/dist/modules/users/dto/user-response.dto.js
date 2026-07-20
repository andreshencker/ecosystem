"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserResponseDto = void 0;
class UserResponseDto {
    id;
    email;
    firstName;
    lastName;
    avatarUrl;
    role;
    scope;
    companyId;
    businessKey;
    isActive;
    isEmailVerified;
    mustChangePassword;
    createdAt;
    static from(user) {
        const dto = new UserResponseDto();
        dto.id = String(user._id ?? user.id);
        dto.email = user.email;
        dto.firstName = user.firstName;
        dto.lastName = user.lastName;
        dto.avatarUrl = user.avatarUrl ?? null;
        dto.role = user.role;
        dto.scope = user.scope;
        dto.companyId = user.companyId ?? null;
        dto.businessKey = user.businessKey ?? null;
        dto.isActive = user.isActive ?? true;
        dto.isEmailVerified = user.isEmailVerified ?? false;
        dto.mustChangePassword = user.mustChangePassword ?? false;
        dto.createdAt = user.createdAt;
        return dto;
    }
}
exports.UserResponseDto = UserResponseDto;
//# sourceMappingURL=user-response.dto.js.map