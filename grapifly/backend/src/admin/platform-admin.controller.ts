import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { SessionGuard, SessionRequest } from '../auth/session.guard';
import { ApplicationsService } from '../applications/applications.service';
import { ApplicationAssignmentsService } from '../access/application-assignments.service';
import { UsersService } from '../users/users.service';
import { PlatformAdminGuard } from './platform-admin.guard';
import { PlatformAdminService } from './platform-admin.service';
import { RoleCatalogService, type RoleFlow } from '../roles/role-catalog.service';
import type { CreateRoleDto } from '../roles/dto/create-role.dto';
import type { UpdateRoleDto } from '../roles/dto/update-role.dto';
import type { CreateApplicationDto } from '../applications/dto/create-application.dto';
import type { UpdateApplicationDto } from '../applications/dto/update-application.dto';
import { OrganizationsService } from '../organizations/organizations.service';
import type { CreateOrganizationDto } from '../organizations/dto/create-organization.dto';
import type { UpdateOrganizationDto } from '../organizations/dto/update-organization.dto';

@Controller('admin')
@UseGuards(SessionGuard, PlatformAdminGuard)
export class PlatformAdminController {
  constructor(
    private readonly admins: PlatformAdminService,
    private readonly users: UsersService,
    private readonly applications: ApplicationsService,
    private readonly assignments: ApplicationAssignmentsService,
    private readonly roleCatalog: RoleCatalogService,
    private readonly organizations: OrganizationsService,
  ) {}

  @Get('me')
  me(@Req() request: SessionRequest) {
    return this.admins.requireActiveAdmin(request.grapiflySession!.sub);
  }

  @Get('admins')
  listAdmins() {
    return this.admins.listAdmins();
  }

  @Get('admin-levels')
  async listAdminLevels() {
    return { levels: await this.roleCatalog.rolesForFlow('internal') };
  }

  @Get('role-catalog')
  async listRoleCatalog() {
    const roles = await this.roleCatalog.listAll();
    const flows: Record<string, typeof roles> = { owner: [], provider: [], internal: [] };
    for (const role of roles) (flows[role.flow] ??= []).push(role);
    return { flows };
  }

  @Post('role-catalog')
  createRole(@Body() body: CreateRoleDto) {
    return this.roleCatalog.createRole(body.flow, body.roleKey, body.description);
  }

  @Patch('role-catalog/:flow/:roleKey')
  updateRole(
    @Param('flow') flow: RoleFlow,
    @Param('roleKey') roleKey: string,
    @Body() body: UpdateRoleDto,
  ) {
    return this.roleCatalog.updateRole(flow, roleKey, body.description);
  }

  @Delete('role-catalog/:flow/:roleKey')
  deleteRole(@Param('flow') flow: RoleFlow, @Param('roleKey') roleKey: string) {
    return this.roleCatalog.deleteRole(flow, roleKey);
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

  @Post('applications')
  createApplication(@Body() body: CreateApplicationDto) {
    return this.applications.createApplication(body);
  }

  @Patch('applications/:key')
  updateApplication(@Param('key') key: string, @Body() body: UpdateApplicationDto) {
    return this.applications.updateApplication(key, body);
  }

  @Delete('applications/:key')
  deleteApplication(@Param('key') key: string) {
    return this.applications.deleteApplication(key);
  }

  @Get('access')
  async listAccess() {
    const assignments = await this.assignments.listAll();
    return { assignments, total: assignments.length };
  }

  @Get('organizations')
  async listOrganizations() {
    const organizations = await this.organizations.listAllForAdmin();
    return { organizations, total: organizations.length };
  }

  @Post('organizations')
  createOrganization(@Body() body: CreateOrganizationDto) {
    return this.organizations.createForAdmin(body);
  }

  @Patch('organizations/:organizationId')
  updateOrganization(@Param('organizationId') organizationId: string, @Body() body: UpdateOrganizationDto) {
    return this.organizations.updateProfileForAdmin(organizationId, body);
  }

  @Delete('organizations/:organizationId')
  archiveOrganization(@Param('organizationId') organizationId: string) {
    return this.organizations.archiveForAdmin(organizationId);
  }
}
