import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { GoogleIdentity, UsersService } from '../users/users.service';
import { SsoCode, SsoCodeDocument } from './schemas/sso-code.schema';
import { Organization, OrganizationDocument } from '../organizations/schemas/organization.schema';
import { OrganizationMembership, OrganizationMembershipDocument } from '../organizations/schemas/organization-membership.schema';
import { OrganizationApplication, OrganizationApplicationDocument } from '../organizations/schemas/organization-application.schema';
import { OrganizationMemberApplication, OrganizationMemberApplicationDocument } from '../organizations/schemas/organization-member-application.schema';
import type { RelaySsoIdentityContract } from './contracts/relay-sso-contract';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectModel(SsoCode.name) private readonly ssoCodes: Model<SsoCodeDocument>,
    @InjectModel(Organization.name) private readonly organizations: Model<OrganizationDocument>,
    @InjectModel(OrganizationMembership.name) private readonly memberships: Model<OrganizationMembershipDocument>,
    @InjectModel(OrganizationApplication.name) private readonly organizationApps: Model<OrganizationApplicationDocument>,
    @InjectModel(OrganizationMemberApplication.name) private readonly memberApps: Model<OrganizationMemberApplicationDocument>,
  ) {}

  async loginWithGoogle(identity: GoogleIdentity) {
    if (!identity.emailVerified) throw new UnauthorizedException('Google email must be verified');
    const user = await this.users.upsertGoogleIdentity(identity);
    const sessionToken = await this.jwt.signAsync({ sub: user.grapiflyUserId, type: 'session' });
    return { user, sessionToken };
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

  async createRelaySsoCode(grapiflyUserId: string, requestedOrganizationId?: string) {
    const user = await this.users.findByGrapiflyUserId(grapiflyUserId);
    if (!user) throw new UnauthorizedException('Grapifly account is inactive');
    const access = await this.resolveRelayAccess(grapiflyUserId, requestedOrganizationId);
    const code = randomBytes(32).toString('base64url');
    await this.ssoCodes.create({
      codeHash: this.hash(code),
      grapiflyUserId,
      appKey: 'relay',
      organizationId: access.organization.organizationId,
      expiresAt: new Date(Date.now() + 60_000),
    });
    return code;
  }

  async exchangeSsoCode(code: string, appKey: string, clientSecret: string | undefined) {
    if (appKey !== 'relay' || !this.validClientSecret(clientSecret)) {
      throw new UnauthorizedException('Invalid SSO client');
    }
    const now = new Date();
    const grant = await this.ssoCodes.findOneAndUpdate(
      { codeHash: this.hash(code), appKey: 'relay', consumedAt: null, expiresAt: { $gt: now } },
      { $set: { consumedAt: now } },
      { new: true },
    ).lean();
    if (!grant) throw new UnauthorizedException('Invalid or expired SSO code');
    const user = await this.users.findByGrapiflyUserId(grant.grapiflyUserId);
    if (!user) throw new UnauthorizedException('Grapifly account is inactive');
    const access = await this.resolveRelayAccess(grant.grapiflyUserId, grant.organizationId);
    return {
      contractVersion: 2,
      issuer: 'grapifly',
      audience: 'relay',
      grapiflyUserId: user.grapiflyUserId,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      organization: this.toRelayOrganization(access.organization),
      access: {
        organizationRole: access.membership.role,
        applicationRole: access.memberApp.role,
        permissions: this.relayPermissions(access.memberApp.role),
      },
    } satisfies RelaySsoIdentityContract;
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
      helpCenterUrl: organization.helpCenterUrl,
      privacyPolicyUrl: organization.privacyPolicyUrl,
      termsUrl: organization.termsUrl,
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

  private async resolveRelayAccess(grapiflyUserId: string, requestedOrganizationId?: string) {
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

    for (const organization of organizations) {
      const membership = membershipByOrganization.get(organization.organizationId)!;
      const [organizationApp, memberApp] = await Promise.all([
        this.organizationApps.findOne({ organizationId: membership.organizationId, applicationKey: 'relay', status: 'active' }).lean(),
        this.memberApps.findOne({ organizationId: membership.organizationId, grapiflyUserId, applicationKey: 'relay', status: 'active' }).lean(),
      ]);
      if (organizationApp && memberApp) {
        return { organization, membership, memberApp };
      }
    }
    throw new ForbiddenException('Relay access is not enabled for this organization');
  }

  private relayPermissions(role: 'owner' | 'admin' | 'operator' | 'viewer'): string[] {
    const base = ['relay.use'];
    if (role === 'viewer') return base;
    if (role === 'operator') return [...base, 'relay.execute'];
    const management = [
      'relay.connections.manage',
      'relay.credentials.manage',
      'relay.automations.manage',
      'relay.theme.manage',
    ];
    return role === 'owner' ? [...base, ...management, 'relay.members.manage', 'relay.organization.manage'] : [...base, ...management, 'relay.members.manage'];
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private validClientSecret(candidate: string | undefined) {
    const expected = this.config.get<string>('GRAPIFLY_SSO_CLIENT_SECRET');
    if (!candidate || !expected) return false;
    const a = Buffer.from(candidate);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
