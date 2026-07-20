import type { UserRole, UserScope } from '../schemas/user.schema';
export declare class UserResponseDto {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    role: UserRole;
    scope: UserScope;
    companyId: string | null;
    businessKey: string | null;
    isActive: boolean;
    isEmailVerified: boolean;
    mustChangePassword: boolean;
    createdAt: Date;
    static from(user: any): UserResponseDto;
}
