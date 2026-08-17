import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicationsModule } from '../applications/applications.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { OrganizationApplication, OrganizationApplicationSchema } from './schemas/organization-application.schema';
import { OrganizationInvitation, OrganizationInvitationSchema } from './schemas/organization-invitation.schema';
import { OrganizationMembership, OrganizationMembershipSchema } from './schemas/organization-membership.schema';
import { OrganizationMemberApplication, OrganizationMemberApplicationSchema } from './schemas/organization-member-application.schema';
import { Organization, OrganizationSchema } from './schemas/organization.schema';
import { OrganizationsController } from './organizations.controller';
import { RelayTeamController } from './relay-team.controller';
import { RelayOrganizationController, RelayOrganizationListController } from './relay-organization.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    ApplicationsModule,
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
    RelayOrganizationListController,
    RelayOrganizationController,
    RelayTeamController,
  ],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
