import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash, randomBytes } from 'crypto';
import { GoogleIdentity, UsersService } from '../users/users.service';
import { SsoCode, SsoCodeDocument } from './schemas/sso-code.schema';
import { Organization, OrganizationDocument } from '../organizations/schemas/organization.schema';
import { OrganizationMembership, OrganizationMembershipDocument } from '../organizations/schemas/organization-membership.schema';
import { OrganizationApplication, OrganizationApplicationDocument } from '../organizations/schemas/organization-application.schema';
import { OrganizationMemberApplication, OrganizationMemberApplicationDocument } from '../organizations/schemas/organization-member-application.schema';
import { ApplicationsService } from '../applications/applications.service';
import { ApplicationAssignmentsService } from '../access/application-assignments.service';
import type { EcosystemSsoIdentityContract } from './contracts/relay-sso-contract';
import { RoleCatalogService, type RoleFlow } from '../roles/role-catalog.service';
import { PlatformAdmin, PlatformAdminDocument } from '../admin/schemas/platform-admin.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    @InjectModel(SsoCode.name) private readonly ssoCodes: Model<SsoCodeDocument>,
    @InjectModel(Organization.name) private readonly organizations: Model<OrganizationDocument>,
    @InjectModel(OrganizationMembership.name) private readonly memberships: Model<OrganizationMembershipDocument>,
    @InjectModel(OrganizationApplication.name) private readonly organizationApps: Model<OrganizationApplicationDocument>,
    @InjectModel(OrganizationMemberApplication.name) private readonly memberApps: Model<OrganizationMemberApplicationDocument>,
    @InjectModel(PlatformAdmin.name) private readonly platformAdmins: Model<PlatformAdminDocument>,
    private readonly applications: ApplicationsService,
    private readonly applicationAssignments: ApplicationAssignmentsService,
    private readonly roleCatalog: RoleCatalogService,
  ) {}

  async loginWithGoogle(identity: GoogleIdentity, requestedType: 'client' | 'provider' = 'client') {
    if (!identity.emailVerified) throw new UnauthorizedException('Google email must be verified');
    const { user, wasNew, organizationId } = await this.users.upsertGoogleIdentity(identity, requestedType);
    const sessionToken = await this.jwt.signAsync({ sub: user.grapiflyUserId, type: 'session' });
    return { user, sessionToken, wasNew, organizationId };
  }

  /** Grants the app a brand-new provider signed up through — see ApplicationAssignmentsService.grantProviderSignup. */
  async grantProviderSignup(grapiflyUserId: string, organizationId: string, appKey: string) {
    await this.applicationAssignments.grantProviderSignup(grapiflyUserId, organizationId, appKey);
  }

  async getUser(grapiflyUserId: string) {
    return this.users.findByGrapiflyUserId(grapiflyUserId);
  }

  async resolveSession(token: string | undefined) {
    if (!token) return null;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; type: 'session' }>(token);
      return payload.type === 'session' ? payload : null;
    } catch {
      return null;
    }
  }

  /** Throws NotFoundException if appKey isn't a real, active entry in the Applications catalogue. */
  async assertActiveApplication(appKey: string) {
    const application = await this.applications.findByKey(appKey);
    if (!application) throw new NotFoundException(`Unknown or inactive application: ${appKey}`);
    return application;
  }

  async createSsoCode(appKey: string, grapiflyUserId: string, requestedOrganizationId?: string) {
    const user = await this.users.findByGrapiflyUserId(grapiflyUserId);
    if (!user) throw new UnauthorizedException('Grapifly account is inactive');
    const access = await this.resolveApplicationAccess(appKey, grapiflyUserId, requestedOrganizationId);
    const code = randomBytes(32).toString('base64url');
    await this.ssoCodes.create({
      codeHash: this.hash(code),
      grapiflyUserId,
      appKey,
      organizationId: access.organization.organizationId,
      expiresAt: new Date(Date.now() + 60_000),
    });
    return code;
  }

  async exchangeSsoCode(code: string, appKey: string, clientSecret: string | undefined) {
    await this.applicationAssignments.assertAppClient(appKey, clientSecret);
    const now = new Date();
    const grant = await this.ssoCodes.findOneAndUpdate(
      { codeHash: this.hash(code), appKey, consumedAt: null, expiresAt: { $gt: now } },
      { $set: { consumedAt: now } },
      { new: true },
    ).lean();
    if (!grant) throw new UnauthorizedException('Invalid or expired SSO code');
    const user = await this.users.findByGrapiflyUserId(grant.grapiflyUserId);
    if (!user) throw new UnauthorizedException('Grapifly account is inactive');
    const access = await this.resolveApplicationAccess(appKey, grant.grapiflyUserId, grant.organizationId);
    return {
      contractVersion: 3,
      issuer: 'grapifly',
      audience: appKey,
      grapiflyUserId: user.grapiflyUserId,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      organization: this.toRelayOrganization(access.organization),
      access: {
        flow: access.flow,
        organizationRole: access.organizationRole,
        applicationRole: access.applicationRole,
        tier: access.tier,
      },
    } satisfies EcosystemSsoIdentityContract;
  }

  private toRelayOrganization(organization: Organization) {
    return {
      organizationId: organization.organizationId,
      name: organization.name,
      slug: organization.slug,
      entityType: organization.entityType,
      legalName: organization.legalName,
      tagline: organization.tagline,
      timezone: organization.timezone,
      officialEmail: organization.officialEmail,
      supportEmail: organization.supportEmail,
      supportPhone: organization.supportPhone,
      supportPhoneCountryCode: organization.supportPhoneCountryCode,
      supportPhoneNumber: organization.supportPhoneNumber,
      supportHours: organization.supportHours,
      addressLine1: organization.addressLine1,
      addressLine2: organization.addressLine2,
      addressCity: organization.addressCity,
      addressState: organization.addressState,
      addressPostalCode: organization.addressPostalCode,
      addressCountry: organization.addressCountry,
      websiteUrl: organization.websiteUrl,
      apiBaseUrl: organization.apiBaseUrl,
      helpCenterUrl: organization.helpCenterUrl,
      privacyPolicyUrl: organization.privacyPolicyUrl,
      termsUrl: organization.termsUrl,
      unsubscribeUrl: organization.unsubscribeUrl,
      facebook: organization.facebook,
      instagram: organization.instagram,
      linkedin: organization.linkedin,
      x: organization.x,
      youtube: organization.youtube,
      tiktok: organization.tiktok,
      whatsapp: organization.whatsapp,
      telegram: organization.telegram,
      copyrightText: organization.copyrightText,
      disclaimerShort: organization.disclaimerShort,
      disclaimerLong: organization.disclaimerLong,
      logoIconUrl: organization.logoIconUrl,
      logoFullUrl: organization.logoFullUrl,
      isPlatform: organization.isPlatform,
      isDefault: organization.isDefault,
      status: organization.status,
    };
  }

  /** Picks the best organization (per the sort order below) where the user has both org-membership and active access to the given app. */
  private async resolveApplicationAccess(appKey: string, grapiflyUserId: string, requestedOrganizationId?: string) {
    const [user, application] = await Promise.all([
      this.users.findByGrapiflyUserId(grapiflyUserId),
      this.assertActiveApplication(appKey),
    ]);
    if (!user) throw new UnauthorizedException('Grapifly account is inactive');
    const flow = user.tipo as RoleFlow;
    if (!application.allowedFlows?.includes(flow)) {
      throw new ForbiddenException(`${appKey} is not enabled for the ${flow} flow`);
    }

    if (flow === 'internal') {
      const admin = await this.platformAdmins.findOne({ grapiflyUserId, status: 'active' }).lean();
      if (!admin || !(await this.roleCatalog.isValidRole('internal', admin.role))) {
        throw new ForbiddenException('Active internal role is required');
      }
      const organization = await this.organizations.findOne({
        ...(requestedOrganizationId ? { organizationId: requestedOrganizationId } : { isPlatform: true }),
        isPlatform: true,
        status: 'active',
      }).lean();
      if (!organization) throw new ForbiddenException('Platform organization is unavailable');
      const organizationApp = await this.organizationApps.findOne({
        organizationId: organization.organizationId,
        applicationKey: appKey,
        status: 'active',
      }).lean();
      if (!organizationApp) throw new ForbiddenException(`${appKey} is not enabled for the platform organization`);
      return {
        organization,
        flow,
        organizationRole: 'member' as const,
        applicationRole: admin.role,
        tier: organizationApp.tier ?? 'free',
      };
    }

    const memberships = await this.memberships.find({
      grapiflyUserId,
      status: 'active',
      ...(requestedOrganizationId ? { organizationId: requestedOrganizationId } : {}),
    }).lean();

    const organizations = await this.organizations.find({
      organizationId: { $in: memberships.map((membership) => membership.organizationId) },
      status: 'active',
    }).sort({ isDefault: -1, isPlatform: -1, createdAt: 1 }).lean();
    const membershipByOrganization = new Map(
      memberships.map((membership) => [membership.organizationId, membership]),
    );

    // Providers additionally need an approved (active) ApplicationAssignment
    // for this exact app — that's the per-app approval gate a signup can
    // land as 'pending' in; clients/internal don't go through it.
    const hasProviderAssignment = flow !== 'provider' || (await this.applicationAssignments.hasActiveAccess(grapiflyUserId, appKey));
    if (!hasProviderAssignment) {
      throw new ForbiddenException(`${appKey} provider access is pending approval`);
    }

    for (const organization of organizations) {
      const membership = membershipByOrganization.get(organization.organizationId)!;
      const [organizationApp, memberApp] = await Promise.all([
        this.organizationApps.findOne({ organizationId: membership.organizationId, applicationKey: appKey, status: 'active' }).lean(),
        this.memberApps.findOne({ organizationId: membership.organizationId, grapiflyUserId, applicationKey: appKey, status: 'active' }).lean(),
      ]);
      if (organizationApp && memberApp && await this.roleCatalog.isValidRole(flow, memberApp.role)) {
        return {
          organization,
          flow,
          organizationRole: membership.role,
          applicationRole: memberApp.role,
          tier: organizationApp.tier ?? 'free',
        };
      }
    }
    throw new ForbiddenException(`${appKey} access is not enabled for this organization`);
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
