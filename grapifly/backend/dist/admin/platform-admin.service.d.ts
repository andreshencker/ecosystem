import { OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { PlatformAdmin, PlatformAdminDocument } from './schemas/platform-admin.schema';
export declare class PlatformAdminService implements OnApplicationBootstrap {
    private readonly admins;
    private readonly users;
    private readonly config;
    private readonly logger;
    constructor(admins: Model<PlatformAdminDocument>, users: UsersService, config: ConfigService);
    onApplicationBootstrap(): Promise<void>;
    requireActiveAdmin(grapiflyUserId: string): Promise<import("mongoose").Document<unknown, {}, PlatformAdmin, {}, import("mongoose").DefaultSchemaOptions> & PlatformAdmin & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
}
