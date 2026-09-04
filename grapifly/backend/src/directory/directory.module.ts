import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ApplicationAssignmentsModule } from '../access/application-assignments.module';
import { Organization, OrganizationSchema } from '../organizations/schemas/organization.schema';
import { GrapiflyUser, GrapiflyUserSchema } from '../users/schemas/user.schema';
import { DirectoryController } from './directory.controller';
import { DirectoryService } from './directory.service';
import { EcosystemAppGuard } from './ecosystem-app.guard';

/**
 * Ecosystem Internal API surface (docs/architecture/ecosystem-internal-api.md).
 * Depends only on raw schemas + ApplicationAssignments (for the app-secret
 * check) so it never pulls Organizations/UsersModule into a cycle.
 */
@Module({
  imports: [
    ApplicationAssignmentsModule,
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: GrapiflyUser.name, schema: GrapiflyUserSchema },
    ]),
  ],
  controllers: [DirectoryController],
  providers: [DirectoryService, EcosystemAppGuard],
})
export class DirectoryModule {}
