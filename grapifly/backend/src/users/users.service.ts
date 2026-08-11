import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import { GrapiflyUser, GrapiflyUserDocument } from './schemas/user.schema';
import { Organization, OrganizationDocument } from '../organizations/schemas/organization.schema';
import { OrganizationMembership, OrganizationMembershipDocument } from '../organizations/schemas/organization-membership.schema';
import { OrganizationApplication, OrganizationApplicationDocument } from '../organizations/schemas/organization-application.schema';
import { OrganizationMemberApplication, OrganizationMemberApplicationDocument } from '../organizations/schemas/organization-member-application.schema';

export interface GoogleIdentity {
  subject: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  avatarUrl: string | null;
}

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    @InjectModel(GrapiflyUser.name)
    private readonly users: Model<GrapiflyUserDocument>,
    @InjectModel(Organization.name) private readonly organizations: Model<OrganizationDocument>,
    @InjectModel(OrganizationMembership.name) private readonly memberships: Model<OrganizationMembershipDocument>,
    @InjectModel(OrganizationApplication.name) private readonly organizationApplications: Model<OrganizationApplicationDocument>,
    @InjectModel(OrganizationMemberApplication.name) private readonly memberApplications: Model<OrganizationMemberApplicationDocument>,
  ) {}

  async onApplicationBootstrap() {
    const users = await this.users.find({ isActive: true, email: { $ne: 'grapiflydeveloper@gmail.com' } }).lean();
    await Promise.all(users.map((user) => this.ensureDefaultOrganization(user.grapiflyUserId, user.displayName, user.email)));
    this.logger.log(`Default organization provisioning ready (${users.length} user accounts checked).`);
  }

  async upsertGoogleIdentity(identity: GoogleIdentity) {
    const user = await this.users.findOneAndUpdate(
      { provider: 'google', providerSubject: identity.subject },
      {
        $set: {
          email: identity.email.toLowerCase(),
          emailVerified: identity.emailVerified,
          displayName: identity.displayName,
          avatarUrl: identity.avatarUrl,
          lastLoginAt: new Date(),
        },
        $setOnInsert: {
          grapiflyUserId: `gpf_usr_${randomUUID().replaceAll('-', '')}`,
          provider: 'google',
          providerSubject: identity.subject,
          isActive: true,
        },
      },
      { upsert: true, new: true },
    ).lean();
    await this.ensureDefaultOrganization(user.grapiflyUserId, user.displayName, user.email);
    return user;
  }

  private async ensureDefaultOrganization(grapiflyUserId: string, displayName: string, email: string) {
    const existing = await this.organizations.findOne({ createdBy: grapiflyUserId, isDefault: true }).lean();
    const suffix = grapiflyUserId.replace('gpf_usr_', '').slice(-12);
    const organizationId = existing?.organizationId ?? `gpf_org_default_${suffix}`;
    if (!existing) {
      await this.organizations.findOneAndUpdate(
        { organizationId },
        {
          $set: { status: 'active', isDefault: true },
          $setOnInsert: {
            name: displayName?.trim() ? `${displayName.trim()}'s workspace` : 'My workspace',
            slug: `personal-${suffix}`,
            entityType: 'individual',
            createdBy: grapiflyUserId,
            officialEmail: email,
            isPlatform: false,
          },
        },
        { upsert: true, returnDocument: 'after' },
      );
    }
    await this.memberships.findOneAndUpdate(
      { organizationId, grapiflyUserId },
      { $set: { role: 'owner', status: 'active' }, $setOnInsert: { membershipId: `gpf_mem_default_${suffix}` } },
      { upsert: true, returnDocument: 'after' },
    );
    await this.organizationApplications.findOneAndUpdate(
      { organizationId, applicationKey: 'relay' },
      { $set: { status: 'active', enabledBy: grapiflyUserId } },
      { upsert: true, returnDocument: 'after' },
    );
    await this.memberApplications.findOneAndUpdate(
      { organizationId, grapiflyUserId, applicationKey: 'relay' },
      { $set: { role: 'owner', status: 'active' } },
      { upsert: true, returnDocument: 'after' },
    );
  }

  findByGrapiflyUserId(grapiflyUserId: string) {
    return this.users.findOne({ grapiflyUserId, isActive: true }).lean();
  }

  findByEmail(email: string) {
    return this.users.findOne({ email: email.toLowerCase().trim(), isActive: true }).lean();
  }

  listAll() {
    return this.users
      .find()
      .select('grapiflyUserId email emailVerified displayName avatarUrl isActive provider lastLoginAt createdAt')
      .sort({ createdAt: -1 })
      .lean();
  }
}
