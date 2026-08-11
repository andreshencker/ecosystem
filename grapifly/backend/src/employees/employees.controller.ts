import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { SessionGuard, SessionRequest } from '../auth/session.guard';
import { UsersService } from '../users/users.service';
import { EmployeeGuard } from './employee.guard';
import { EmployeesService } from './employees.service';

@Controller('internal')
@UseGuards(SessionGuard, EmployeeGuard)
export class EmployeesController {
  constructor(
    private readonly employees: EmployeesService,
    private readonly users: UsersService,
  ) {}

  @Get('me')
  me(@Req() request: SessionRequest) {
    return this.employees.requireActiveEmployee(request.grapiflySession!.sub);
  }

  @Get('users')
  async listUsers() {
    const users = await this.users.listAll();
    return { users, total: users.length };
  }
}
