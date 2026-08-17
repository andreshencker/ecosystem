import { SessionRequest } from '../auth/session.guard';
import { ApplicationsService } from '../applications/applications.service';
import { ApplicationAssignmentsService } from '../access/application-assignments.service';
import { UsersService } from '../users/users.service';
import { PlatformAdminService } from './platform-admin.service';
export declare class PlatformAdminController {
    private readonly admins;
    private readonly users;
    private readonly applications;
    private readonly assignments;
    constructor(admins: PlatformAdminService, users: UsersService, applications: ApplicationsService, assignments: ApplicationAssignmentsService);
    me(request: SessionRequest): Promise<import("mongoose").Document<unknown, {}, import("./schemas/platform-admin.schema").PlatformAdmin, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/platform-admin.schema").PlatformAdmin & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    listUsers(): Promise<{
        users: (import("mongoose").Document<unknown, {}, import("../users/schemas/user.schema").GrapiflyUser, {}, import("mongoose").DefaultSchemaOptions> & import("../users/schemas/user.schema").GrapiflyUser & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & {
            id: string;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
        total: number;
    }>;
    listApplications(): Promise<{
        applications: (import("mongoose").Document<unknown, {}, import("../applications/schemas/application.schema").Application, {}, import("mongoose").DefaultSchemaOptions> & import("../applications/schemas/application.schema").Application & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & {
            id: string;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
        total: number;
    }>;
    listAccess(): Promise<{
        assignments: {
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
        }[];
        total: number;
    }>;
}
