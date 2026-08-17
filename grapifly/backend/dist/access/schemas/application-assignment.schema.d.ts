import { HydratedDocument } from 'mongoose';
export type ApplicationAssignmentDocument = HydratedDocument<ApplicationAssignment>;
export declare class ApplicationAssignment {
    grapiflyUserId: string;
    applicationKey: string;
    status: 'active' | 'suspended' | 'revoked';
    source: 'bootstrap' | 'admin' | 'migration';
    grantedAt: Date;
}
export declare const ApplicationAssignmentSchema: import("mongoose").Schema<ApplicationAssignment, import("mongoose").Model<ApplicationAssignment, any, any, any, any, any, ApplicationAssignment>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ApplicationAssignment, import("mongoose").Document<unknown, {}, ApplicationAssignment, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<ApplicationAssignment & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    grapiflyUserId?: import("mongoose").SchemaDefinitionProperty<string, ApplicationAssignment, import("mongoose").Document<unknown, {}, ApplicationAssignment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ApplicationAssignment & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    applicationKey?: import("mongoose").SchemaDefinitionProperty<string, ApplicationAssignment, import("mongoose").Document<unknown, {}, ApplicationAssignment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ApplicationAssignment & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<"active" | "suspended" | "revoked", ApplicationAssignment, import("mongoose").Document<unknown, {}, ApplicationAssignment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ApplicationAssignment & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    source?: import("mongoose").SchemaDefinitionProperty<"bootstrap" | "admin" | "migration", ApplicationAssignment, import("mongoose").Document<unknown, {}, ApplicationAssignment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ApplicationAssignment & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    grantedAt?: import("mongoose").SchemaDefinitionProperty<Date, ApplicationAssignment, import("mongoose").Document<unknown, {}, ApplicationAssignment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ApplicationAssignment & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, ApplicationAssignment>;
