import { OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { EmployeeProfile, EmployeeProfileDocument } from './schemas/employee-profile.schema';
export declare class EmployeesService implements OnApplicationBootstrap {
    private readonly employees;
    private readonly users;
    private readonly config;
    private readonly logger;
    constructor(employees: Model<EmployeeProfileDocument>, users: UsersService, config: ConfigService);
    onApplicationBootstrap(): Promise<void>;
    requireActiveEmployee(grapiflyUserId: string): Promise<import("mongoose").Document<unknown, {}, EmployeeProfile, {}, import("mongoose").DefaultSchemaOptions> & EmployeeProfile & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    findActiveEmployee(grapiflyUserId: string): import("mongoose").Query<(import("mongoose").Document<unknown, {}, EmployeeProfile, {}, import("mongoose").DefaultSchemaOptions> & EmployeeProfile & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>) | null, import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, EmployeeProfile, {}, import("mongoose").DefaultSchemaOptions> & EmployeeProfile & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, EmployeeProfile, {}, import("mongoose").DefaultSchemaOptions> & EmployeeProfile & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>, {}, import("mongoose").Document<unknown, {}, EmployeeProfile, {}, import("mongoose").DefaultSchemaOptions> & EmployeeProfile & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, "findOne", {}>;
}
