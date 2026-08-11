import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { SessionGuard, SessionRequest } from '../auth/session.guard';
import { ApplicationsService } from '../applications/applications.service';
import { ApplicationAssignmentsService } from '../access/application-assignments.service';
import { UsersService } from '../users/users.service';
import { PlatformAdminGuard } from './platform-admin.guard';
import { PlatformAdminService } from './platform-admin.service';

@Controller('admin')
@UseGuards(SessionGuard, PlatformAdminGuard)
export class PlatformAdminController {
  constructor(
    private readonly admins: PlatformAdminService,
    private readonly users: UsersService,
    private readonly applications: ApplicationsService,
    private readonly assignments: ApplicationAssignmentsService,
  ) {}

  @Get('me')
  me(@Req() request: SessionRequest) {
    return this.admins.requireActiveAdmin(request.grapiflySession!.sub);
  }

  @Get('users')
  async listUsers() {
    const users = await this.users.listAll();
    return { users, total: users.length };
  }

  @Get('applications')
  async listApplications() {
    const applications = await this.applications.listAll();
    return { applications, total: applications.length };
  }

  @Get('access')
  async listAccess() {
    const assignments = await this.assignments.listAll();
    return { assignments, total: assignments.length };
  }
}
