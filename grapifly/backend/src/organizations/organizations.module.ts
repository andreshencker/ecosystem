import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicationsModule } from '../applications/applications.module';
import { ApplicationAssignmentsModule } from '../access/application-assignments.module';
import { RoleCatalogModule } from '../roles/role-catalog.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { RelayNotificationsModule } from '../relay-notifications/relay-notifications.module';
import { OrganizationApplication, OrganizationApplicationSchema } from './schemas/organization-application.schema';
import { OrganizationInvitation, OrganizationInvitationSchema } from './schemas/organization-invitation.schema';
import { OrganizationMembership, OrganizationMembershipSchema } from './schemas/organization-membership.schema';
import { OrganizationMemberApplication, OrganizationMemberApplicationSchema } from './schemas/organization-member-application.schema';
import { Organization, OrganizationSchema } from './schemas/organization.schema';
import { OrganizationsController } from './organizations.controller';
import { AppTeamController } from './app-team.controller';
import { AppOrganizationController, AppOrganizationListController } from './app-organization.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    ApplicationsModule,
    ApplicationAssignmentsModule,
    RoleCatalogModule,
    RelayNotificationsModule,
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: OrganizationMembership.name, schema: OrganizationMembershipSchema },
      { name: OrganizationMemberApplication.name, schema: OrganizationMemberApplicationSchema },
      { name: OrganizationApplication.name, schema: OrganizationApplicationSchema },
      { name: OrganizationInvitation.name, schema: OrganizationInvitationSchema },
    ]),
  ],
  controllers: [
    OrganizationsController,
    AppOrganizationListController,
    AppOrganizationController,
    AppTeamController,
  ],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
