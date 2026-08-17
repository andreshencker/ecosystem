import { OnApplicationBootstrap } from '@nestjs/common';
import { Model } from 'mongoose';
import { GrapiflyUser, GrapiflyUserDocument } from './schemas/user.schema';
import { OrganizationDocument } from '../organizations/schemas/organization.schema';
import { OrganizationMembershipDocument } from '../organizations/schemas/organization-membership.schema';
import { OrganizationApplicationDocument } from '../organizations/schemas/organization-application.schema';
import { OrganizationMemberApplicationDocument } from '../organizations/schemas/organization-member-application.schema';
export interface GoogleIdentity {
    subject: string;
    email: string;
    emailVerified: boolean;
    displayName: string;
    avatarUrl: string | null;
}
export declare class UsersService implements OnApplicationBootstrap {
    private readonly users;
    private readonly organizations;
    private readonly memberships;
    private readonly organizationApplications;
    private readonly memberApplications;
    private readonly logger;
    constructor(users: Model<GrapiflyUserDocument>, organizations: Model<OrganizationDocument>, memberships: Model<OrganizationMembershipDocument>, organizationApplications: Model<OrganizationApplicationDocument>, memberApplications: Model<OrganizationMemberApplicationDocument>);
    onApplicationBootstrap(): Promise<void>;
    upsertGoogleIdentity(identity: GoogleIdentity): Promise<import("mongoose").Document<unknown, {}, GrapiflyUser, {}, import("mongoose").DefaultSchemaOptions> & GrapiflyUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    private ensureDefaultOrganization;
    findByGrapiflyUserId(grapiflyUserId: string): import("mongoose").Query<(import("mongoose").Document<unknown, {}, GrapiflyUser, {}, import("mongoose").DefaultSchemaOptions> & GrapiflyUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>) | null, import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, GrapiflyUser, {}, import("mongoose").DefaultSchemaOptions> & GrapiflyUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, GrapiflyUser, {}, import("mongoose").DefaultSchemaOptions> & GrapiflyUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>, {}, import("mongoose").Document<unknown, {}, GrapiflyUser, {}, import("mongoose").DefaultSchemaOptions> & GrapiflyUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, "findOne", {}>;
    findByEmail(email: string): import("mongoose").Query<(import("mongoose").Document<unknown, {}, GrapiflyUser, {}, import("mongoose").DefaultSchemaOptions> & GrapiflyUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>) | null, import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, GrapiflyUser, {}, import("mongoose").DefaultSchemaOptions> & GrapiflyUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, GrapiflyUser, {}, import("mongoose").DefaultSchemaOptions> & GrapiflyUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>, {}, import("mongoose").Document<unknown, {}, GrapiflyUser, {}, import("mongoose").DefaultSchemaOptions> & GrapiflyUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, "findOne", {}>;
    listAll(): import("mongoose").Query<(import("mongoose").Document<unknown, {}, GrapiflyUser, {}, import("mongoose").DefaultSchemaOptions> & GrapiflyUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[], import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, GrapiflyUser, {}, import("mongoose").DefaultSchemaOptions> & GrapiflyUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, GrapiflyUser, {}, import("mongoose").DefaultSchemaOptions> & GrapiflyUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>, {}, import("mongoose").Document<unknown, {}, GrapiflyUser, {}, import("mongoose").DefaultSchemaOptions> & GrapiflyUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, "find", {}>;
}
