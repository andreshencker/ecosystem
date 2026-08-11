import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { Model } from 'mongoose';
import { ApplicationsService } from '../applications/applications.service';
import { UsersService } from '../users/users.service';
import { OrganizationApplication, OrganizationApplicationDocument } from './schemas/organization-application.schema';
import { OrganizationInvitation, OrganizationInvitationDocument } from './schemas/organization-invitation.schema';
import { OrganizationMembership, OrganizationMembershipDocument } from './schemas/organization-membership.schema';
import { OrganizationMemberApplication, OrganizationMemberApplicationDocument } from './schemas/organization-member-application.schema';
import { Organization, OrganizationDocument } from './schemas/organization.schema';

@Injectable()
export class OrganizationsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(OrganizationsService.name);
  constructor(
    @InjectModel(Organization.name) private readonly organizations: Model<OrganizationDocument>,
    @InjectModel(OrganizationMembership.name) private readonly memberships: Model<OrganizationMembershipDocument>,
    @InjectModel(OrganizationMemberApplication.name) private readonly memberApplications: Model<OrganizationMemberApplicationDocument>,
    @InjectModel(OrganizationApplication.name) private readonly organizationApplications: Model<OrganizationApplicationDocument>,
    @InjectModel(OrganizationInvitation.name) private readonly invitations: Model<OrganizationInvitationDocument>,
    private readonly users: UsersService,
    private readonly applications: ApplicationsService,
  ) {}

  async onApplicationBootstrap() {
    const owner = await this.users.findByEmail('grapiflydeveloper@gmail.com');
    if (!owner) {
      this.logger.warn('Official Grapifly organization pending: owner identity not found.');
      return;
    }
    const organizationId = 'gpf_org_grapifly';
    await this.organizations.findOneAndUpdate(
      { organizationId },
      {
        $set: { name: 'Grapifly', slug: 'grapifly', entityType: 'company', isPlatform: true, status: 'active' },
        $setOnInsert: {
          createdBy: owner.grapiflyUserId,
          legalName: '', tagline: 'Solutions that make ideas fly.', timezone: 'Australia/Sydney',
          officialEmail: owner.email,
        },
      },
      { upsert: true, returnDocument: 'after' },
    );
    await this.memberships.findOneAndUpdate(
      { organizationId, grapiflyUserId: owner.grapiflyUserId },
      { $set: { role: 'owner', status: 'active' }, $setOnInsert: { membershipId: `gpf_mem_${randomUUID().replaceAll('-', '')}` } },
      { upsert: true, returnDocument: 'after' },
    );
    await this.enableApplication(owner.grapiflyUserId, organizationId, 'relay');
    this.logger.log('Official Grapifly organization ready (platform=true, owner assigned, Relay enabled).');
  }

  async create(grapiflyUserId: string, name: string, entityType: 'company' | 'individual' = 'company') {
    const normalizedName = name?.trim();
    if (!normalizedName || normalizedName.length < 2 || normalizedName.length > 80) {
      throw new BadRequestException('Organization name must contain between 2 and 80 characters');
    }
    const organizationId = `gpf_org_${randomUUID().replaceAll('-', '')}`;
    const slugBase = normalizedName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'organization';
    const slug = `${slugBase}-${organizationId.slice(-6)}`;
    if (!['company', 'individual'].includes(entityType)) throw new BadRequestException('Organization type must be company or individual');
    const organization = await this.organizations.create({ organizationId, name: normalizedName, slug, entityType, createdBy: grapiflyUserId, status: 'active', isPlatform: false });
    await this.memberships.create({ membershipId: `gpf_mem_${randomUUID().replaceAll('-', '')}`, organizationId, grapiflyUserId, role: 'owner', status: 'active' });
    return organization.toObject();
  }

  async listForUser(grapiflyUserId: string) {
    const memberships = await this.memberships.find({ grapiflyUserId, status: 'active' }).lean();
    const organizationIds = memberships.map((membership) => membership.organizationId);
    const [organizations, applications] = await Promise.all([
      this.organizations.find({ organizationId: { $in: organizationIds }, status: 'active' }).sort({ name: 1 }).lean(),
      this.organizationApplications.find({ organizationId: { $in: organizationIds }, status: 'active' }).lean(),
    ]);
    const membershipByOrganization = new Map(memberships.map((membership) => [membership.organizationId, membership]));
    return organizations.map((organization) => ({
      ...organization,
      membership: membershipByOrganization.get(organization.organizationId),
      applications: applications.filter((app) => app.organizationId === organization.organizationId).map((app) => app.applicationKey),
    }));
  }

  async getDetails(grapiflyUserId: string, organizationId: string) {
    const membership = await this.requireMembership(grapiflyUserId, organizationId);
    const [organization, memberships, applications, memberApplications, invitations] = await Promise.all([
      this.organizations.findOne({ organizationId, status: 'active' }).lean(),
      this.memberships.find({ organizationId, status: 'active' }).lean(),
      this.organizationApplications.find({ organizationId, status: 'active' }).lean(),
      this.memberApplications.find({ organizationId, status: 'active' }).lean(),
      membership.role === 'member' ? Promise.resolve([]) : this.invitations.find({ organizationId, status: 'pending' }).select('-tokenHash').lean(),
    ]);
    if (!organization) throw new NotFoundException('Organization not found');
    const users = await Promise.all(memberships.map((item) => this.users.findByGrapiflyUserId(item.grapiflyUserId)));
    return {
      organization,
      membership,
      applications,
      members: memberships.map((item, index) => ({
        ...item,
        user: users[index],
        applications: memberApplications.filter((access) => access.grapiflyUserId === item.grapiflyUserId),
      })),
      invitations,
    };
  }

  async enableApplication(grapiflyUserId: string, organizationId: string, applicationKey: string) {
    await this.requireManager(grapiflyUserId, organizationId);
    const application = await this.applications.findByKey(applicationKey);
    if (!application) throw new BadRequestException('Application is not available');
    const enabled = await this.organizationApplications.findOneAndUpdate(
      { organizationId, applicationKey: application.key },
      { $set: { status: 'active', enabledBy: grapiflyUserId } },
      { upsert: true, returnDocument: 'after' },
    ).lean();
    const manager = await this.requireMembership(grapiflyUserId, organizationId);
    await this.memberApplications.findOneAndUpdate(
      { organizationId, grapiflyUserId, applicationKey: application.key },
      { $set: { status: 'active', role: manager.role } },
      { upsert: true, returnDocument: 'after' },
    );
    return enabled;
  }

  async updateProfile(grapiflyUserId: string, organizationId: string, input: Record<string, unknown>) {
    await this.requireManager(grapiflyUserId, organizationId);
    const entityType = input.entityType;
    if (entityType !== undefined && entityType !== 'company' && entityType !== 'individual') {
      throw new BadRequestException('Organization type must be company or individual');
    }
    const limits: Record<string, number> = {
      name: 80, legalName: 200, tagline: 300, timezone: 100,
      officialEmail: 200, supportEmail: 200, supportPhoneCountryCode: 5, supportPhoneNumber: 30, supportHours: 200,
      addressLine1: 200, addressLine2: 200, addressCity: 100, addressState: 100, addressPostalCode: 20, addressCountry: 100,
      websiteUrl: 500, helpCenterUrl: 500, privacyPolicyUrl: 500, termsUrl: 500,
      facebook: 500, instagram: 500, linkedin: 500, x: 500, youtube: 500, tiktok: 500, whatsapp: 500, telegram: 500,
      copyrightText: 500, disclaimerShort: 500, disclaimerLong: 2000, logoIconUrl: 500, logoFullUrl: 500,
    };
    const updates: Record<string, string> = {};
    if (entityType) updates.entityType = entityType;
    for (const [field, maxLength] of Object.entries(limits)) {
      if (!(field in input)) continue;
      if (typeof input[field] !== 'string') throw new BadRequestException(`${field} must be text`);
      const value = input[field].trim();
      if (value.length > maxLength) throw new BadRequestException(`${field} exceeds ${maxLength} characters`);
      updates[field] = value;
    }
    if ('name' in updates && updates.name.length < 2) throw new BadRequestException('Organization name must contain at least 2 characters');
    for (const field of ['officialEmail', 'supportEmail']) {
      if (updates[field] && !/^\S+@\S+\.\S+$/.test(updates[field])) throw new BadRequestException(`${field} must be a valid email`);
      if (updates[field]) updates[field] = updates[field].toLowerCase();
    }
    if (updates.supportPhoneCountryCode && !/^\+[1-9]\d{0,3}$/.test(updates.supportPhoneCountryCode)) {
      throw new BadRequestException('supportPhoneCountryCode must use international format, for example +61');
    }
    if (updates.supportPhoneNumber && !/^[0-9 ()-]{6,30}$/.test(updates.supportPhoneNumber)) {
      throw new BadRequestException('supportPhoneNumber contains invalid characters');
    }
    if ('supportPhoneCountryCode' in updates || 'supportPhoneNumber' in updates) {
      updates.supportPhone = [updates.supportPhoneCountryCode ?? '', updates.supportPhoneNumber ?? ''].filter(Boolean).join(' ');
    }
    for (const field of ['websiteUrl', 'helpCenterUrl', 'privacyPolicyUrl', 'termsUrl', 'facebook', 'instagram', 'linkedin', 'x', 'youtube', 'tiktok', 'whatsapp', 'telegram', 'logoIconUrl', 'logoFullUrl']) {
      if (!updates[field]) continue;
      try { new URL(updates[field]); } catch { throw new BadRequestException(`${field} must be a valid URL`); }
    }
    return this.organizations.findOneAndUpdate(
      { organizationId, status: 'active' },
      { $set: updates },
      { returnDocument: 'after' },
    ).lean();
  }

  async invite(grapiflyUserId: string, organizationId: string, input: { email: string; role?: string; applicationKeys?: string[] }) {
    await this.requireManager(grapiflyUserId, organizationId);
    const email = input.email?.trim().toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new BadRequestException('A valid email is required');
    const role = input.role === 'admin' ? 'admin' : 'member';
    const applicationKeys = [...new Set((input.applicationKeys ?? []).map((key) => key.trim().toLowerCase()).filter(Boolean))];
    for (const key of applicationKeys) {
      const enabled = await this.organizationApplications.exists({ organizationId, applicationKey: key, status: 'active' });
      if (!enabled) throw new BadRequestException(`Application ${key} is not enabled for this organization`);
    }
    const existingUser = await this.users.findByEmail(email);
    if (existingUser && await this.memberships.exists({ organizationId, grapiflyUserId: existingUser.grapiflyUserId, status: 'active' })) {
      throw new BadRequestException('This user is already a member');
    }
    await this.invitations.updateMany({ organizationId, email, status: 'pending' }, { $set: { status: 'cancelled' } });
    const token = randomBytes(32).toString('base64url');
    const invitation = await this.invitations.create({
      invitationId: `gpf_inv_${randomUUID().replaceAll('-', '')}`,
      organizationId,
      email,
      role,
      applicationKeys,
      tokenHash: this.hash(token),
      invitedBy: grapiflyUserId,
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      acceptedAt: null,
    });
    return { invitation: { ...invitation.toObject(), tokenHash: undefined }, token };
  }

  async accept(grapiflyUserId: string, token: string) {
    const user = await this.users.findByGrapiflyUserId(grapiflyUserId);
    if (!user) throw new ForbiddenException('Active Grapifly identity required');
    const invitation = await this.invitations.findOne({ tokenHash: this.hash(token), status: 'pending' }).select('+tokenHash');
    if (!invitation || invitation.expiresAt <= new Date()) throw new BadRequestException('Invitation is invalid or expired');
    if (invitation.email !== user.email.toLowerCase()) throw new ForbiddenException('This invitation belongs to another email address');
    await this.memberships.findOneAndUpdate(
      { organizationId: invitation.organizationId, grapiflyUserId },
      { $set: { role: invitation.role, status: 'active' }, $setOnInsert: { membershipId: `gpf_mem_${randomUUID().replaceAll('-', '')}` } },
      { upsert: true, returnDocument: 'after' },
    );
    await Promise.all(invitation.applicationKeys.map((applicationKey) => this.memberApplications.findOneAndUpdate(
      { organizationId: invitation.organizationId, grapiflyUserId, applicationKey },
      { $set: { role: invitation.role, status: 'active' } },
      { upsert: true, returnDocument: 'after' },
    )));
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date();
    await invitation.save();
    return { organizationId: invitation.organizationId, applicationKeys: invitation.applicationKeys };
  }

  private async requireMembership(grapiflyUserId: string, organizationId: string) {
    const membership = await this.memberships.findOne({ organizationId, grapiflyUserId, status: 'active' }).lean();
    if (!membership) throw new ForbiddenException('Organization access required');
    return membership;
  }

  private async requireManager(grapiflyUserId: string, organizationId: string) {
    const membership = await this.requireMembership(grapiflyUserId, organizationId);
    if (!['owner', 'admin'].includes(membership.role)) throw new ForbiddenException('Organization administrator access required');
    return membership;
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
