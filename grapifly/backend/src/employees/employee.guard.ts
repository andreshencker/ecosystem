import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { SessionRequest } from '../auth/session.guard';

@Injectable()
export class EmployeeGuard implements CanActivate {
  constructor(private readonly employees: EmployeesService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    await this.employees.requireActiveEmployee(request.grapiflySession!.sub);
    return true;
  }
}
