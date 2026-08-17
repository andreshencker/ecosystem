import { OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { ApplicationsService } from '../applications/applications.service';
import { UsersService } from '../users/users.service';
import { ApplicationAssignment, ApplicationAssignmentDocument } from './schemas/application-assignment.schema';
export declare class ApplicationAssignmentsService implements OnApplicationBootstrap {
    private readonly assignments;
    private readonly users;
    private readonly applications;
    private readonly config;
    private readonly logger;
    constructor(assignments: Model<ApplicationAssignmentDocument>, users: UsersService, applications: ApplicationsService, config: ConfigService);
    onApplicationBootstrap(): Promise<void>;
    listAll(): Promise<{
        user: (import("mongoose").Document<unknown, {}, import("../users/schemas/user.schema").GrapiflyUser, {}, import("mongoose").DefaultSchemaOptions> & import("../users/schemas/user.schema").GrapiflyUser & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & {
            id: string;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>) | null;
        application: (import("mongoose").Document<unknown, {}, import("../applications/schemas/application.schema").Application, {}, import("mongoose").DefaultSchemaOptions> & import("../applications/schemas/application.schema").Application & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & {
            id: string;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>) | null;
        _id: import("mongoose").Types.ObjectId;
        $locals: Record<string, unknown>;
        $op: "save" | "validate" | "remove" | null;
        $where: Record<string, unknown>;
        baseModelName?: string;
        collection: import("mongoose").Collection;
        db: import("mongoose").Connection;
        errors?: import("mongoose").Error.ValidationError;
        isNew: boolean;
        schema: import("mongoose").Schema;
        grapiflyUserId: string;
        applicationKey: string;
        status: "active" | "suspended" | "revoked";
        source: "bootstrap" | "admin" | "migration";
        grantedAt: Date;
        __v: number;
        id: string;
    }[]>;
    hasActiveAccess(grapiflyUserId: string, applicationKey: string): import("mongoose").Query<{
        _id: import("mongoose").Types.ObjectId;
    } | null, import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, ApplicationAssignment, {}, import("mongoose").DefaultSchemaOptions> & ApplicationAssignment & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, ApplicationAssignment, {}, import("mongoose").DefaultSchemaOptions> & ApplicationAssignment & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>, {}, import("mongoose").Document<unknown, {}, ApplicationAssignment, {}, import("mongoose").DefaultSchemaOptions> & ApplicationAssignment & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, "findOne", {}>;
}
