import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GrapiflyUser, GrapiflyUserSchema } from './schemas/user.schema';
import { UsersService } from './users.service';
import { Organization, OrganizationSchema } from '../organizations/schemas/organization.schema';
import { OrganizationMembership, OrganizationMembershipSchema } from '../organizations/schemas/organization-membership.schema';
import { ApplicationAssignmentsModule } from '../access/application-assignments.module';

@Module({
  imports: [
    ApplicationAssignmentsModule,
    MongooseModule.forFeature([
      { name: GrapiflyUser.name, schema: GrapiflyUserSchema },
      { name: Organization.name, schema: OrganizationSchema },
      { name: OrganizationMembership.name, schema: OrganizationMembershipSchema },
    ]),
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
