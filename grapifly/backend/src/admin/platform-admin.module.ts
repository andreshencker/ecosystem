import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicationsModule } from '../applications/applications.module';
import { ApplicationAssignmentsModule } from '../access/application-assignments.module';
import { RoleCatalogModule } from '../roles/role-catalog.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { RelayNotificationsModule } from '../relay-notifications/relay-notifications.module';
import { PlatformAdminController } from './platform-admin.controller';
import { AdminInvitationsController } from './admin-invitations.controller';
import { PlatformAdminGuard } from './platform-admin.guard';
import { PlatformAdminService } from './platform-admin.service';
import { PlatformAdmin, PlatformAdminSchema } from './schemas/platform-admin.schema';
import { AdminInvitation, AdminInvitationSchema } from './schemas/admin-invitation.schema';
import { GrapiflyUser, GrapiflyUserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    ApplicationsModule,
    ApplicationAssignmentsModule,
    RoleCatalogModule,
    OrganizationsModule,
    RelayNotificationsModule,
    MongooseModule.forFeature([
      { name: PlatformAdmin.name, schema: PlatformAdminSchema },
      { name: AdminInvitation.name, schema: AdminInvitationSchema },
      { name: GrapiflyUser.name, schema: GrapiflyUserSchema },
    ]),
  ],
  controllers: [PlatformAdminController, AdminInvitationsController],
  providers: [PlatformAdminService, PlatformAdminGuard],
})
export class PlatformAdminModule {}
