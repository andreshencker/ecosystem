// src/modules/users/types/users.ts

export type UserRole = "ADMIN" | "CLIENT" | "PROVIDER"; // backend enum

export type User = {
    id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    secondLastName?: string;
    email: string;
    role: UserRole;
    isActive: boolean;

    avatarUrl?: string;

    // opcionales si tu backend los devuelve
    emailVerified?: boolean;
    mustChangePassword?: boolean;

    createdAt?: string;
    updatedAt?: string;
};

export type CreateUserAdminDto = {
    firstName: string;
    middleName?: string;
    lastName: string;
    secondLastName?: string;
    email: string;
    role: UserRole;
    isActive?: boolean;
    avatarUrl?: string;
};

export type UpdateProfileDto = {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    secondLastName?: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
};

export type UsersFiltersValue = {
    search: string;
    role: "" | UserRole;
    isActive: boolean | null;
};