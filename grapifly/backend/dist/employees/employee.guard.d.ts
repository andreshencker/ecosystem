import { CanActivate, ExecutionContext } from '@nestjs/common';
import { EmployeesService } from './employees.service';
export declare class EmployeeGuard implements CanActivate {
    private readonly employees;
    constructor(employees: EmployeesService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
