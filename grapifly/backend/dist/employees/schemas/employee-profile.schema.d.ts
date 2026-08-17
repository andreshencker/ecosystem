import { HydratedDocument } from 'mongoose';
export type EmployeeProfileDocument = HydratedDocument<EmployeeProfile>;
export type EmployeeRole = 'ecosystem_super_admin';
export declare class EmployeeProfile {
    grapiflyUserId: string;
    email: string;
    role: EmployeeRole;
    status: 'active' | 'suspended';
    department: string;
    title: string;
}
export declare const EmployeeProfileSchema: import("mongoose").Schema<EmployeeProfile, import("mongoose").Model<EmployeeProfile, any, any, any, any, any, EmployeeProfile>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, EmployeeProfile, import("mongoose").Document<unknown, {}, EmployeeProfile, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<EmployeeProfile & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    grapiflyUserId?: import("mongoose").SchemaDefinitionProperty<string, EmployeeProfile, import("mongoose").Document<unknown, {}, EmployeeProfile, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EmployeeProfile & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    email?: import("mongoose").SchemaDefinitionProperty<string, EmployeeProfile, import("mongoose").Document<unknown, {}, EmployeeProfile, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EmployeeProfile & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    role?: import("mongoose").SchemaDefinitionProperty<"ecosystem_super_admin", EmployeeProfile, import("mongoose").Document<unknown, {}, EmployeeProfile, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EmployeeProfile & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<"active" | "suspended", EmployeeProfile, import("mongoose").Document<unknown, {}, EmployeeProfile, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EmployeeProfile & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    department?: import("mongoose").SchemaDefinitionProperty<string, EmployeeProfile, import("mongoose").Document<unknown, {}, EmployeeProfile, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EmployeeProfile & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    title?: import("mongoose").SchemaDefinitionProperty<string, EmployeeProfile, import("mongoose").Document<unknown, {}, EmployeeProfile, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EmployeeProfile & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, EmployeeProfile>;
