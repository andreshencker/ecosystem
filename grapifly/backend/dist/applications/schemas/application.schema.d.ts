import { HydratedDocument } from 'mongoose';
export type ApplicationDocument = HydratedDocument<Application>;
export declare class Application {
    key: string;
    name: string;
    description: string;
    launchUrl: string;
    ownership: 'first_party' | 'third_party';
    status: 'active' | 'inactive';
    displayOrder: number;
}
export declare const ApplicationSchema: import("mongoose").Schema<Application, import("mongoose").Model<Application, any, any, any, any, any, Application>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Application, import("mongoose").Document<unknown, {}, Application, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Application & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    key?: import("mongoose").SchemaDefinitionProperty<string, Application, import("mongoose").Document<unknown, {}, Application, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Application & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    name?: import("mongoose").SchemaDefinitionProperty<string, Application, import("mongoose").Document<unknown, {}, Application, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Application & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    description?: import("mongoose").SchemaDefinitionProperty<string, Application, import("mongoose").Document<unknown, {}, Application, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Application & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    launchUrl?: import("mongoose").SchemaDefinitionProperty<string, Application, import("mongoose").Document<unknown, {}, Application, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Application & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    ownership?: import("mongoose").SchemaDefinitionProperty<"first_party" | "third_party", Application, import("mongoose").Document<unknown, {}, Application, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Application & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<"active" | "inactive", Application, import("mongoose").Document<unknown, {}, Application, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Application & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    displayOrder?: import("mongoose").SchemaDefinitionProperty<number, Application, import("mongoose").Document<unknown, {}, Application, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Application & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, Application>;
