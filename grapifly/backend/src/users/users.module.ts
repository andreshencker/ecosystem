import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GrapiflyUser, GrapiflyUserSchema } from './schemas/user.schema';
import { UsersService } from './users.service';
import { Organization, OrganizationSchema } from '../organizations/schemas/organization.schema';
import { OrganizationMembership, OrganizationMembershipSchema } from '../organizations/schemas/organization-membership.schema';
import { OrganizationApplication, OrganizationApplicationSchema } from '../organizations/schemas/organization-application.schema';
import { OrganizationMemberApplication, OrganizationMemberApplicationSchema } from '../organizations/schemas/organization-member-application.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: GrapiflyUser.name, schema: GrapiflyUserSchema },
    { name: Organization.name, schema: OrganizationSchema },
    { name: OrganizationMembership.name, schema: OrganizationMembershipSchema },
    { name: OrganizationApplication.name, schema: OrganizationApplicationSchema },
    { name: OrganizationMemberApplication.name, schema: OrganizationMemberApplicationSchema },
  ])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
