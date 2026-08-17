import { OnApplicationBootstrap } from '@nestjs/common';
import { Model } from 'mongoose';
import { Application, ApplicationDocument } from './schemas/application.schema';
export declare class ApplicationsService implements OnApplicationBootstrap {
    private readonly applications;
    private readonly logger;
    constructor(applications: Model<ApplicationDocument>);
    onApplicationBootstrap(): Promise<void>;
    listAll(): import("mongoose").Query<(import("mongoose").Document<unknown, {}, Application, {}, import("mongoose").DefaultSchemaOptions> & Application & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[], import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Application, {}, import("mongoose").DefaultSchemaOptions> & Application & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, Application, {}, import("mongoose").DefaultSchemaOptions> & Application & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>, {}, import("mongoose").Document<unknown, {}, Application, {}, import("mongoose").DefaultSchemaOptions> & Application & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, "find", {}>;
    findByKey(key: string): import("mongoose").Query<(import("mongoose").Document<unknown, {}, Application, {}, import("mongoose").DefaultSchemaOptions> & Application & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>) | null, import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Application, {}, import("mongoose").DefaultSchemaOptions> & Application & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, Application, {}, import("mongoose").DefaultSchemaOptions> & Application & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>, {}, import("mongoose").Document<unknown, {}, Application, {}, import("mongoose").DefaultSchemaOptions> & Application & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, "findOne", {}>;
}
