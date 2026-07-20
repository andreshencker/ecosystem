import { Model } from 'mongoose';
import { UserDocument } from './schemas/user.schema';
import type { UserRole } from './schemas/user.schema';
import { BusinessDocument } from '../business/schemas/business.schema';
export declare class UsersService {
    private readonly model;
    private readonly companyModel;
    constructor(model: Model<UserDocument>, companyModel: Model<BusinessDocument>);
    findById(id: string): Promise<UserDocument | null>;
    findByIdOrThrow(id: string): Promise<UserDocument>;
    findByEmailWithPassword(email: string): Promise<UserDocument | null>;
    existsByEmail(email: string): Promise<boolean>;
    findByEmailVerificationToken(tokenHash: string): Promise<UserDocument | null>;
    findByPasswordResetToken(tokenHash: string): Promise<UserDocument | null>;
    create(data: {
        email: string;
        passwordHash: string;
        firstName: string;
        lastName: string;
    }): Promise<UserDocument>;
    setEmailVerified(userId: string): Promise<void>;
    setEmailVerificationToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
    setPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
    setPasswordHash(userId: string, passwordHash: string): Promise<void>;
    createInvitedUser(params: {
        email: string;
        firstName: string;
        lastName: string;
        role: UserRole;
        companyId: string | null;
        businessKey: string | null;
    }): Promise<{
        user: UserDocument;
        tempPassword: string;
    }>;
    refreshTemporaryPassword(userId: string): Promise<string>;
    setUserActive(userId: string, isActive: boolean): Promise<UserDocument>;
    listPlatformUsers(params: {
        page: number;
        limit: number;
        search?: string;
    }): Promise<{
        items: UserDocument[];
        total: number;
        page: number;
        limit: number;
    }>;
    listByCompanyId(companyId: string, params: {
        page: number;
        limit: number;
        search?: string;
    }): Promise<{
        items: UserDocument[];
        total: number;
        page: number;
        limit: number;
    }>;
    update(userId: string, data: {
        firstName?: string;
        lastName?: string;
        avatarUrl?: string | null;
    }): Promise<UserDocument>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<UserDocument>;
    deleteById(id: string): Promise<void>;
    countActiveOwners(companyId: string): Promise<number>;
    createCompanyOwnerWithCompany(params: {
        businessName: string;
        email: string;
        passwordHash: string;
        firstName: string;
        lastName: string;
    }): Promise<{
        company: BusinessDocument;
        user: UserDocument;
    }>;
    getPlatformCompanyId(): Promise<string | null>;
    getPlatformCompanyDetails(): Promise<{
        id: string;
        businessName: string;
        businessKey: string;
        isPlatformCompany: boolean;
    } | null>;
    getCompanyDisplayName(companyId: string): Promise<string>;
    private generateTempPassword;
    private slugify;
}
