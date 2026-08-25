import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicationsModule } from '../applications/applications.module';
import { ApplicationAssignmentsService } from './application-assignments.service';
import { ApplicationAssignment, ApplicationAssignmentSchema } from './schemas/application-assignment.schema';
import {
  OrganizationApplication,
  OrganizationApplicationSchema,
} from '../organizations/schemas/organization-application.schema';
import {
  OrganizationMemberApplication,
  OrganizationMemberApplicationSchema,
} from '../organizations/schemas/organization-member-application.schema';
import { GrapiflyUser, GrapiflyUserSchema } from '../users/schemas/user.schema';

// Depends on Applications + raw schemas only (never UsersModule/OrganizationsModule)
// so that both of those modules can safely depend on this one without a cycle.
@Module({
  imports: [
    ApplicationsModule,
    MongooseModule.forFeature([
      { name: ApplicationAssignment.name, schema: ApplicationAssignmentSchema },
      { name: OrganizationApplication.name, schema: OrganizationApplicationSchema },
      { name: OrganizationMemberApplication.name, schema: OrganizationMemberApplicationSchema },
      { name: GrapiflyUser.name, schema: GrapiflyUserSchema },
    ]),
  ],
  providers: [ApplicationAssignmentsService],
  exports: [ApplicationAssignmentsService],
})
export class ApplicationAssignmentsModule {}
