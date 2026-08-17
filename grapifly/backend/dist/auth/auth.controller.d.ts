import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SessionRequest } from './session.guard';
export declare class AuthController {
    private readonly auth;
    private readonly config;
    constructor(auth: AuthService, config: ConfigService);
    googleLogin(): void;
    continueInvitation(token: string, response: Response): void;
    googleCallback(request: Request, response: Response): Promise<void>;
    me(request: SessionRequest): Promise<(import("mongoose").Document<unknown, {}, import("../users/schemas/user.schema").GrapiflyUser, {}, import("mongoose").DefaultSchemaOptions> & import("../users/schemas/user.schema").GrapiflyUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>) | null>;
    logout(response: Response): Response<any, Record<string, any>>;
    logoutFromRelay(response: Response): void;
    relaySso(request: SessionRequest, response: Response): Promise<void>;
    exchangeSso(body: {
        code: string;
        appKey: string;
    }, clientSecret: string | undefined): Promise<{
        contractVersion: 2;
        issuer: "grapifly";
        audience: "relay";
        grapiflyUserId: string;
        email: string;
        emailVerified: boolean;
        displayName: string;
        avatarUrl: string | null;
        organization: {
            organizationId: string;
            name: string;
            slug: string;
            entityType: "company" | "individual";
            legalName: string;
            tagline: string;
            timezone: string;
            officialEmail: string;
            supportEmail: string;
            supportPhone: string;
            supportPhoneCountryCode: string;
            supportPhoneNumber: string;
            supportHours: string;
            addressLine1: string;
            addressLine2: string;
            addressCity: string;
            addressState: string;
            addressPostalCode: string;
            addressCountry: string;
            websiteUrl: string;
            apiBaseUrl: string;
            helpCenterUrl: string;
            privacyPolicyUrl: string;
            termsUrl: string;
            unsubscribeUrl: string;
            facebook: string;
            instagram: string;
            linkedin: string;
            x: string;
            youtube: string;
            tiktok: string;
            whatsapp: string;
            telegram: string;
            copyrightText: string;
            disclaimerShort: string;
            disclaimerLong: string;
            logoIconUrl: string;
            logoFullUrl: string;
            isPlatform: boolean;
            isDefault: boolean;
            status: "active" | "suspended" | "archived";
        };
        access: {
            organizationRole: "owner" | "admin" | "member";
            applicationRole: import("../organizations/schemas/organization-member-application.schema").ApplicationMemberRole;
            permissions: string[];
        };
    }>;
}
