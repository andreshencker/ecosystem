import { SessionRequest } from '../auth/session.guard';
import { UsersService } from '../users/users.service';
import { EmployeesService } from './employees.service';
export declare class EmployeesController {
    private readonly employees;
    private readonly users;
    constructor(employees: EmployeesService, users: UsersService);
    me(request: SessionRequest): Promise<import("mongoose").Document<unknown, {}, import("./schemas/employee-profile.schema").EmployeeProfile, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/employee-profile.schema").EmployeeProfile & {
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
}
